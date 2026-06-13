import { desc, eq } from "drizzle-orm";
import { approveSuggestion, dismissSuggestion } from "@/app/actions";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { suggestions } from "@/lib/schema";
import { scoreFromPayload, tierLabel } from "@/lib/referral-score";

export const dynamic = "force-dynamic";

type NewCompanyPayload = {
  name?: string;
  category?: string;
  address?: string | null;
  nearCompanyName?: string;
  distanceMeters?: number | null;
};

function scoreTone(combined: number) {
  if (combined >= 66) return "bg-emerald-100 text-emerald-800";
  if (combined >= 40) return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

export default async function InboxPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const pending = await db
    .select()
    .from(suggestions)
    .where(eq(suggestions.status, "pending"))
    .orderBy(desc(suggestions.createdAt));

  // Score each prospect (warmth × fit) and rank by the combined score so the
  // strongest referral opportunities sit at the top.
  const scored = pending
    .map((suggestion) => {
      const payload = (suggestion.payload ?? {}) as NewCompanyPayload;
      return { suggestion, payload, score: scoreFromPayload(payload) };
    })
    .sort((a, b) => b.score.combined - a.score.combined);

  return (
    <CrmShell
      username={session.username}
      title="Sourcing inbox"
      description="Nearby businesses sourced around your customers, ranked by referral strength (warmth × fit). Promote the good ones — each lands wired to the customer it was found near."
    >
      <article className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ranked prospects</h2>
            <p className="mt-1 text-sm text-slate-600">
              Scored by how likely your customer knows them (proximity) and how well they fit your book.
            </p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            {scored.length} pending
          </span>
        </div>

        <ul className="mt-4 space-y-3">
          {scored.length === 0 ? (
            <li>
              <EmptyState
                icon="task"
                message="No suggestions in the queue. Run npm run source:nearby to find businesses near your customers."
              />
            </li>
          ) : null}

          {scored.map(({ suggestion, payload, score }) => (
            <li key={suggestion.id} className="rounded-lg border border-slate-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-slate-900">{payload.name ?? suggestion.title}</p>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${scoreTone(score.combined)}`}>
                      {score.combined}
                    </span>
                    {payload.category ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {payload.category}
                      </span>
                    ) : null}
                  </div>
                  {payload.address ? (
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-700">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-400">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {payload.address}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-slate-600">{suggestion.evidence}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {tierLabel(score.tier)}
                    {payload.nearCompanyName ? ` · near ${payload.nearCompanyName}` : ""}
                    {" — "}
                    <span className="font-medium text-slate-600">warmth {score.warmth}</span> · <span className="font-medium text-slate-600">fit {score.fit}</span>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <form action={approveSuggestion}>
                    <input type="hidden" name="suggestionId" value={suggestion.id} />
                    <button
                      type="submit"
                      className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      Add as lead
                    </button>
                  </form>
                  <form action={dismissSuggestion}>
                    <input type="hidden" name="suggestionId" value={suggestion.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Dismiss
                    </button>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </article>
    </CrmShell>
  );
}
