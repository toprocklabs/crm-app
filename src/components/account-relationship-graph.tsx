import { and, desc, eq, or } from "drizzle-orm";
import Link from "next/link";
import { createRelationship, deleteRelationship } from "@/app/actions";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { EmptyState } from "@/components/empty-state";
import { RelationshipEditor } from "@/components/relationship-editor";
import { getDb } from "@/lib/db";
import { edgeTypeOptions, getEdgeTypeLabel, getEdgeTypeTone, getWarmthTone } from "@/lib/edge-type";
import { findProximityNeighbors, findWarmPaths } from "@/lib/graph";
import { companies, contacts, relationships } from "@/lib/schema";
import type { EntityType } from "@/lib/schema";

// The relationship graph / warm-paths feature is parked: the UI is only
// half-built, so it's hidden rather than deleted. Flipping this to true restores
// the section, its queries, and the nav anchor.
//
// It lives in its own file as of plan 006 — the account page was rebuilt around
// money and meetings, and 200 lines of switched-off UI in the middle of it made
// the page hard to read. Nothing about the feature changed in the move.
export const SHOW_RELATIONSHIP_GRAPH: boolean = false;

export async function AccountRelationshipGraph({
  companyId,
  isProspect,
}: {
  companyId: number;
  isProspect: boolean;
}) {
  if (!SHOW_RELATIONSHIP_GRAPH) {
    return null;
  }

  const db = getDb();
  if (!db) {
    return null;
  }

  const [companyRelationships, allCompanies, allContacts, warmPaths, proximityNeighbors] = await Promise.all([
    db
      .select()
      .from(relationships)
      .where(
        or(
          and(eq(relationships.fromType, "company"), eq(relationships.fromId, companyId)),
          and(eq(relationships.toType, "company"), eq(relationships.toId, companyId)),
        ),
      )
      .orderBy(desc(relationships.strength)),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(companies.name),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        companyId: contacts.companyId,
      })
      .from(contacts)
      .orderBy(contacts.firstName),
    findWarmPaths(db, "company", companyId),
    findProximityNeighbors(db, companyId),
  ]);

  const companyNameById = new Map(allCompanies.map((row) => [row.id, row.name]));
  const contactNameById = new Map(
    allContacts.map((row) => [row.id, `${row.firstName} ${row.lastName}`.trim()]),
  );
  const labelFor = (type: EntityType, entityId: number) =>
    type === "company"
      ? companyNameById.get(entityId) ?? `Company #${entityId}`
      : contactNameById.get(entityId) ?? `Contact #${entityId}`;
  const hrefFor = (type: EntityType, entityId: number) =>
    type === "company" ? `/accounts/${entityId}` : `/contacts/${entityId}`;

  const relationshipCandidates = [
    ...allCompanies
      .filter((row) => row.id !== companyId)
      .map((row) => ({ type: "company" as const, id: row.id, label: row.name })),
    ...allContacts.map((row) => ({
      type: "contact" as const,
      id: row.id,
      label: `${row.firstName} ${row.lastName}`.trim(),
      sublabel: row.companyId ? companyNameById.get(row.companyId) ?? null : null,
    })),
  ];

  const edgeTypeSelectOptions = edgeTypeOptions.map((edge) => ({
    value: edge,
    label: getEdgeTypeLabel(edge),
  }));

  const displayEdges = companyRelationships.map((edge) => {
    const selfIsFrom = edge.fromType === "company" && edge.fromId === companyId;
    const otherType = selfIsFrom ? edge.toType : edge.fromType;
    const otherId = selfIsFrom ? edge.toId : edge.fromId;
    return {
      id: edge.id,
      edgeType: edge.edgeType,
      otherType,
      otherId,
      otherLabel: labelFor(otherType, otherId),
      otherHref: hrefFor(otherType, otherId),
      strength: edge.strength,
      evidence: edge.evidence,
    };
  });

  return (
    <section id="account-relationships" className="gong-panel rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Relationship Graph</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Trust &amp; Warm Paths</h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Map who this account is connected to. The graph finds the warmest path from a prospect back to a
            customer you&apos;ve already won, so you never go in cold.
          </p>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-right text-sm font-medium text-slate-700">
          <p>{displayEdges.length} relationships</p>
          <p className="text-xs text-slate-500">{warmPaths.length} warm paths found</p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="rounded-xl border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(240,253,250,0.9))] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              {isProspect ? "Warm paths to this prospect" : "How you reached this customer"}
            </p>
            {warmPaths[0] ? (
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getWarmthTone(warmPaths[0].warmth)}`}>
                Best: {warmPaths[0].warmth} warmth
              </span>
            ) : null}
          </div>
          {warmPaths.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">
              No trust path to an existing customer yet. Add relationships below (a referral, a shared plaza, a
              mutual contact) and warm intro paths will surface here automatically.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {warmPaths.map((path, index) => (
                <li key={`${path.anchorKey}-${index}`} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getWarmthTone(path.warmth)}`}>
                      {path.warmth} warmth
                    </span>
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {path.hops} hop{path.hops === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                      min strength {path.minStrength}
                    </span>
                  </div>
                  <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm font-medium text-slate-900">
                    {path.pathLabels.map((label, i) => (
                      <span key={`${label}-${i}`} className="flex items-center gap-1.5">
                        {i > 0 ? <span className="text-slate-400">→</span> : null}
                        <span className="rounded-md bg-slate-100 px-2 py-0.5">{label}</span>
                      </span>
                    ))}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{path.suggestedAsk}</p>
                </li>
              ))}
            </ul>
          )}

          {proximityNeighbors.length > 0 ? (
            <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50/70 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                Plaza neighbors ({proximityNeighbors.length})
              </p>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {proximityNeighbors.slice(0, 5).map((neighbor) => (
                  <li key={neighbor.id} className="flex items-center justify-between gap-2">
                    <Link href={`/accounts/${neighbor.id}`} className="underline decoration-slate-300 underline-offset-2">
                      {neighbor.name}
                    </Link>
                    <span className="text-xs text-slate-500">
                      {neighbor.sharedPlaza
                        ? "same plaza"
                        : neighbor.distanceMeters != null
                          ? `${Math.round(neighbor.distanceMeters)}m away`
                          : "nearby"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Mapped relationships</p>
            <ul className="mt-3 space-y-2">
              {displayEdges.length === 0 ? (
                <li>
                  <EmptyState icon="contact" message="No relationships mapped yet. Add the first connection below." />
                </li>
              ) : null}
              {displayEdges.map((edge) => (
                <li
                  key={edge.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getEdgeTypeTone(edge.edgeType)}`}>
                      {getEdgeTypeLabel(edge.edgeType)}
                    </span>
                    <Link href={edge.otherHref} className="text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-2">
                      {edge.otherLabel}
                    </Link>
                    <span className="text-xs text-slate-500">strength {edge.strength}</span>
                    {edge.evidence ? <span className="text-xs italic text-slate-400">“{edge.evidence}”</span> : null}
                  </div>
                  <form action={deleteRelationship}>
                    <input type="hidden" name="relationshipId" value={edge.id} />
                    <input type="hidden" name="returnPath" value={`/accounts/${companyId}`} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </div>

          <CollapsibleFormSection
            title="Add relationship"
            description="Connect this account to a company or contact to grow the trust graph."
          >
            <RelationshipEditor
              companyId={companyId}
              candidates={relationshipCandidates}
              edgeOptions={edgeTypeSelectOptions}
              returnPath={`/accounts/${companyId}`}
              action={createRelationship}
            />
          </CollapsibleFormSection>
        </div>
      </div>
    </section>
  );
}
