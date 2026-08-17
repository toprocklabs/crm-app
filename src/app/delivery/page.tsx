import { and, desc, eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getPushRecency } from "@/lib/push-recency";
import { companies, projectRepos } from "@/lib/schema";

export const dynamic = "force-dynamic";

// What we're building, across every client (plan 008).
//
// project_repos has mirrored the toprocklabs org since plan 005, but only ever
// surfaced as a "Last push" column on /accounts and a per-account list. There
// was no answer to "what shipped this week", which is the whole point of the
// delivery pillar. This page is that answer.
//
// Read-only. Nothing here writes to GitHub, and the request path never calls
// the GitHub API — it reads Postgres and says how stale that is.

export default async function DeliveryPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  // `last_commit_message` / `_sha` / `_author` exist on the table but are never
  // written: plan 005 keeps the sync to a single org-listing request, which
  // carries `pushed_at` and nothing about the commit. Selecting them would give
  // a column that is empty for all 36 rows and reads as broken.
  const columns = {
    id: projectRepos.id,
    fullName: projectRepos.fullName,
    htmlUrl: projectRepos.htmlUrl,
    lastPushAt: projectRepos.lastPushAt,
    isInternal: projectRepos.isInternal,
    isPrivate: projectRepos.isPrivate,
    syncedAt: projectRepos.syncedAt,
    companyId: projectRepos.companyId,
  };

  const [linked, orphans] = await Promise.all([
    db
      .select({ ...columns, companyName: companies.name })
      .from(projectRepos)
      .innerJoin(companies, eq(companies.id, projectRepos.companyId))
      .where(eq(projectRepos.archived, false))
      .orderBy(desc(projectRepos.lastPushAt)),
    // Delivery with no account behind it. Internal tooling is excluded or the
    // list is mostly us, and then nobody reads it.
    db
      .select(columns)
      .from(projectRepos)
      .where(
        and(
          isNull(projectRepos.companyId),
          eq(projectRepos.archived, false),
          eq(projectRepos.isInternal, false),
        ),
      )
      .orderBy(desc(projectRepos.lastPushAt)),
  ]);

  const internalCount = linked.filter((repo) => repo.isInternal).length;

  // The mirror is refreshed by `npm run sync:repos`, which is still manual — so
  // say how old this is rather than implying it is live.
  const lastSynced = [...linked, ...orphans]
    .map((repo) => repo.syncedAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  // `new Date()`, not `Date.now()` — the lint rule against impure calls during
  // render flags the latter. Same shape /accounts uses.
  const now = new Date().getTime();
  const syncRecency = getPushRecency(lastSynced ?? null, now);

  return (
    <AppShell
      username={session.username}
      title="Delivery"
      description="Every repo we push to, newest first."
    >
      <div className="space-y-4">
        <section className="gong-panel rounded-xl p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Repos</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">
                {linked.length} linked to an account
                {internalCount > 0 ? <span className="text-slate-400"> · {internalCount} internal</span> : null}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Read-only mirror of the <code className="rounded bg-slate-100 px-1">toprocklabs</code> org.
              </p>
            </div>
            <div className="rounded-xl bg-slate-100 px-3 py-2 text-right text-sm font-medium text-slate-700">
              <p>Synced {syncRecency.label}</p>
              <p className="text-xs text-slate-500">
                <code>npm run sync:repos</code> — manual
              </p>
            </div>
          </div>

          <div className="app-table-wrap mt-5">
            <table className="app-data-table w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left">Repo</th>
                  <th className="text-left">Account</th>
                  <th className="text-left">Last push</th>
                </tr>
              </thead>
              <tbody>
                {linked.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <EmptyState icon="task" message="No repos mirrored yet. Run npm run sync:repos." />
                    </td>
                  </tr>
                ) : null}
                {linked.map((repo) => {
                  const recency = getPushRecency(repo.lastPushAt, now);
                  return (
                    <tr key={repo.id}>
                      <td>
                        {repo.htmlUrl ? (
                          <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="app-table-link">
                            {repo.fullName}
                          </a>
                        ) : (
                          <span className="font-medium text-slate-800">{repo.fullName}</span>
                        )}
                        {repo.isInternal ? (
                          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                            internal
                          </span>
                        ) : null}
                      </td>
                      <td>
                        <Link href={`/accounts/${repo.companyId}`} className="app-table-link">
                          {repo.companyName}
                        </Link>
                      </td>
                      <td>
                        <span className="app-push-pill" data-band={recency.band}>
                          {recency.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {orphans.length > 0 ? (
          <section className="gong-panel rounded-xl p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Delivery with no account
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">{orphans.length} unlinked repos</h2>
            <p className="mt-2 text-sm text-slate-600">
              Client work the CRM can&apos;t attribute. Link them with{" "}
              <code className="rounded bg-slate-100 px-1">node scripts/map-repos.mjs --apply</code>, or add the
              account first if it doesn&apos;t exist.
            </p>
            <ul className="mt-4 space-y-2">
              {orphans.map((repo) => {
                const recency = getPushRecency(repo.lastPushAt, now);
                return (
                  <li
                    key={repo.id}
                    className="flex flex-wrap items-baseline gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
                  >
                    <span className="app-push-pill" data-band={recency.band}>
                      {recency.label}
                    </span>
                    {repo.htmlUrl ? (
                      <a href={repo.htmlUrl} target="_blank" rel="noreferrer" className="app-table-link flex-1">
                        {repo.fullName}
                      </a>
                    ) : (
                      <span className="flex-1 text-slate-800">{repo.fullName}</span>
                    )}
                    {repo.isPrivate ? null : (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                        public
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
