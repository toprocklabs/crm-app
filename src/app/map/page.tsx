import { and, eq, isNotNull } from "drizzle-orm";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { SourcingMap } from "@/components/sourcing-map";
import type { MapCandidate } from "@/components/leaflet-canvas";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { companies, suggestions } from "@/lib/schema";
import { scoreFromPayload, tierLabel } from "@/lib/referral-score";

export const dynamic = "force-dynamic";

type CandidatePayload = {
  name?: string;
  category?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  distanceMeters?: number | null;
  nearCompanyName?: string | null;
};

const LEGEND = [
  { label: "Customer", color: "#185FA5" },
  { label: "Account", color: "#888780" },
  { label: "Strong prospect", color: "#1D9E75" },
  { label: "Medium prospect", color: "#BA7517" },
];

export default async function MapPage() {
  const session = await requireUser();
  const db = getDb();
  if (!db) {
    return null;
  }

  const [companyRows, suggestionRows] = await Promise.all([
    db
      .select({
        id: companies.id,
        name: companies.name,
        stage: companies.stage,
        lat: companies.lat,
        lng: companies.lng,
        address: companies.address,
      })
      .from(companies)
      .where(and(isNotNull(companies.lat), isNotNull(companies.lng))),
    db.select().from(suggestions).where(eq(suggestions.status, "pending")),
  ]);

  const geocoded = companyRows.filter(
    (c): c is typeof c & { lat: number; lng: number } => c.lat != null && c.lng != null,
  );
  const customers = geocoded.filter((c) => c.stage === "customer");
  const others = geocoded.filter((c) => c.stage !== "customer");

  const candidates: MapCandidate[] = suggestionRows
    .filter((s) => s.kind === "new_company")
    .map((s) => {
      const p = (s.payload ?? {}) as CandidatePayload;
      const score = scoreFromPayload(p);
      return {
        id: s.id,
        name: p.name ?? s.title,
        category: p.category ?? null,
        address: p.address ?? null,
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        distanceMeters: p.distanceMeters ?? null,
        nearCompanyName: p.nearCompanyName ?? null,
        combined: score.combined,
        warmth: score.warmth,
        fit: score.fit,
        tierLabel: tierLabel(score.tier),
      };
    })
    .filter((c): c is MapCandidate => c.lat != null && c.lng != null);

  const total = customers.length + others.length + candidates.length;

  return (
    <CrmShell
      username={session.username}
      title="Sourcing map"
      description="Your geocoded customers and the nearby businesses sourced around them. Click a candidate pin to add it as a lead or dismiss it."
    >
      <article className="gong-panel rounded-xl p-3">
        {total === 0 ? (
          <EmptyState
            icon="task"
            message="Nothing to map yet. Geocode accounts with npm run enrich:real, then source leads with npm run source:nearby."
          />
        ) : (
          <>
            <SourcingMap customers={customers} others={others} candidates={candidates} />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-sm text-slate-600">
              {LEGEND.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </span>
              ))}
              <span className="text-slate-400">Dashed ring = 250m sourcing radius</span>
              <span className="ml-auto font-medium text-slate-700">
                {customers.length} customers · {candidates.length} candidates
              </span>
            </div>
          </>
        )}
      </article>
    </CrmShell>
  );
}
