import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { agentRuns, suggestions } from "@/lib/schema";

export const dynamic = "force-dynamic";

// What the machines did (plan 008).
//
// `agent_runs` has recorded loop, model, status, tokens, cost and item counts
// since the sourcing loops, and plan 007 made every brain ingest write attribute
// itself to a run. Nothing rendered any of it — to the point that the ingest
// prompt was briefly told runs were "auditable at /inbox", which reads
// `suggestions`, a different table. Either this page exists or that audit trail
// is a claim nobody can check.

const STATUS_STYLE: Record<string, string> = {
  ok: "bg-emerald-100 text-emerald-800",
  running: "bg-cyan-100 text-cyan-800",
  error: "bg-rose-100 text-rose-800",
  halted_budget: "bg-amber-100 text-amber-800",
};

function formatDuration(startedAt: Date, finishedAt: Date | null) {
  if (!finishedAt) return null;
  const seconds = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return minutes < 60 ? `${minutes}m ${seconds % 60}s` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function AgentsPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const [runs, suggestionCounts, pending] = await Promise.all([
    db
      .select()
      .from(agentRuns)
      .orderBy(desc(agentRuns.startedAt))
      .limit(100),
    // Suggestions per run — the link /inbox can't currently make.
    db
      .select({ agentRunId: suggestions.agentRunId, count: sql<number>`count(*)::int` })
      .from(suggestions)
      .groupBy(suggestions.agentRunId),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(suggestions)
      .where(eq(suggestions.status, "pending")),
  ]);

  const suggestionsByRun = new Map(
    suggestionCounts.filter((row) => row.agentRunId !== null).map((row) => [row.agentRunId, row.count]),
  );
  const pendingCount = pending[0]?.count ?? 0;
  const totalCostCents = runs.reduce((sum, run) => sum + run.costCents, 0);
  const stillRunning = runs.filter((run) => !run.finishedAt).length;

  return (
    <AppShell
      username={session.username}
      title="Agent runs"
      description="Every agent execution, what it cost, and what it proposed."
    >
      <section className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Runs</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">
              {runs.length} run{runs.length === 1 ? "" : "s"}
              {stillRunning > 0 ? (
                <span className="text-cyan-700"> · {stillRunning} unfinished</span>
              ) : null}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Anything an agent writes attributes itself to a run.{" "}
              {pendingCount > 0 ? (
                <Link href="/inbox" className="font-semibold text-cyan-700 hover:underline">
                  {pendingCount} suggestion{pendingCount === 1 ? "" : "s"} waiting for review →
                </Link>
              ) : (
                "Nothing is waiting for review."
              )}
            </p>
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2 text-right text-sm font-medium text-slate-700">
            <p>{money(totalCostCents)}</p>
            <p className="text-xs text-slate-500">across these runs</p>
          </div>
        </div>

        <div className="app-table-wrap mt-5">
          <table className="app-data-table w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Loop</th>
                <th className="text-left">Status</th>
                <th className="text-left">Started</th>
                <th className="text-right">Seen</th>
                <th className="text-right">Proposed</th>
                <th className="text-right">Tokens</th>
                <th className="text-right">Cost</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon="task"
                      message="No agent runs yet. They appear here as soon as an ingest or sourcing loop runs."
                    />
                  </td>
                </tr>
              ) : null}
              {runs.map((run) => {
                const duration = formatDuration(run.startedAt, run.finishedAt);
                const proposed = suggestionsByRun.get(run.id) ?? 0;
                return (
                  <tr key={run.id}>
                    <td>
                      <span className="font-medium text-slate-800">{run.loop}</span>
                      {run.model ? <span className="block text-xs text-slate-400">{run.model}</span> : null}
                    </td>
                    <td>
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                          STATUS_STYLE[run.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {run.status}
                      </span>
                      {/* A run that died mid-flight should look dead, not complete. */}
                      {!run.finishedAt && run.status === "running" ? (
                        <span className="ml-1.5 text-[11px] text-slate-400">no end recorded</span>
                      ) : null}
                    </td>
                    <td>
                      <span className="font-mono text-xs text-slate-600">
                        {run.startedAt.toISOString().slice(0, 16).replace("T", " ")}
                      </span>
                      {duration ? <span className="block text-xs text-slate-400">{duration}</span> : null}
                    </td>
                    <td className="text-right tabular-nums text-slate-700">{run.itemsSeen || "—"}</td>
                    <td className="text-right tabular-nums text-slate-700">
                      {proposed > 0 ? (
                        <Link href="/inbox" className="app-table-link">
                          {proposed}
                        </Link>
                      ) : (
                        run.itemsProposed || "—"
                      )}
                    </td>
                    <td className="text-right tabular-nums text-slate-500">
                      {run.tokensIn + run.tokensOut > 0
                        ? (run.tokensIn + run.tokensOut).toLocaleString()
                        : "—"}
                    </td>
                    <td className="text-right tabular-nums text-slate-700">
                      {run.costCents > 0 ? money(run.costCents) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-4 text-xs text-slate-500">
          Cost and token counts are only as good as what each loop reports — a loop that never closes its run
          leaves them at zero. Writes through{" "}
          <code className="rounded bg-slate-100 px-1">/api/brain/documents</code> increment the proposed count
          automatically.
        </p>
      </section>
    </AppShell>
  );
}
