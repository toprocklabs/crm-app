import { desc, eq } from "drizzle-orm";
import { approveSuggestion, dismissSuggestion } from "@/app/actions";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { suggestions } from "@/lib/schema";

export const dynamic = "force-dynamic";

type NewCompanyPayload = {
  name?: string;
  category?: string;
  address?: string | null;
  nearCompanyName?: string;
  distanceMeters?: number | null;
};

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
    .orderBy(desc(suggestions.confidence), desc(suggestions.createdAt));

  return (
    <CrmShell
      username={session.username}
      title="Sourcing inbox"
      description="Nearby businesses sourced around your customers. Promote the good ones to leads — each lands wired to the customer it was found near."
    >
      <article className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pending suggestions</h2>
            <p className="mt-1 text-sm text-slate-600">
              Found via OpenStreetMap around your geocoded customer accounts.
            </p>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            {pending.length} pending
          </span>
        </div>

        <ul className="mt-4 space-y-3">
          {pending.length === 0 ? (
            <li>
              <EmptyState
                icon="task"
                message="No suggestions in the queue. Run npm run source:nearby to find businesses near your customers."
              />
            </li>
          ) : null}

          {pending.map((suggestion) => {
            const payload = (suggestion.payload ?? {}) as NewCompanyPayload;
            return (
              <li key={suggestion.id} className="rounded-lg border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{payload.name ?? suggestion.title}</p>
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
                      Confidence {suggestion.confidence}
                      {payload.nearCompanyName ? ` • near ${payload.nearCompanyName}` : ""}
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
            );
          })}
        </ul>
      </article>
    </CrmShell>
  );
}
