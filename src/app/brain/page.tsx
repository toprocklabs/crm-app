import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/empty-state";
import { SearchInput } from "@/components/search-input";
import { requireUser } from "@/lib/auth";
import { brainStats, listBrainFolders, searchBrain } from "@/lib/brain/queries";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Search and browse the brain (plan 007). Full-text over `search_text`, ranked
// by ts_rank. No body is loaded here — see the rule at the top of
// src/lib/brain/queries.ts.

const KIND_STYLE: Record<string, string> = {
  entity: "bg-cyan-100 text-cyan-800",
  digest: "bg-amber-100 text-amber-800",
  meta: "bg-slate-100 text-slate-600",
};

export default async function BrainPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [results, folders, stats] = await Promise.all([
    searchBrain(db, query),
    listBrainFolders(db),
    brainStats(db),
  ]);

  // Entity folders first — they are the long-lived notes; digests are the tail.
  const folderRows = [...folders].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "entity" ? -1 : b.kind === "entity" ? 1 : 0;
    return a.folder.localeCompare(b.folder);
  });

  return (
    <AppShell
      username={session.username}
      title="Brain"
      description="Every note Toprock has written, searchable."
    >
      <section className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Notes</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">
              {stats.documents} notes · {stats.linked} linked to an account
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Imported from the Obsidian vault. Search matches titles and bodies.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SearchInput placeholder="Search the brain..." />
            <Link
              href="/brain/new"
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              New note
            </Link>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {folderRows.map((row) => (
            <Link
              key={row.folder}
              href={`/brain?q=${encodeURIComponent(row.folder)}`}
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-slate-400"
            >
              {row.folder}
              <span className="ml-1.5 text-slate-400">{row.count}</span>
            </Link>
          ))}
        </div>

        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          {query ? `${results.length} result${results.length === 1 ? "" : "s"} for “${query}”` : "Most recent"}
        </p>

        <ul className="mt-3 space-y-2.5">
          {results.length === 0 ? (
            <li>
              <EmptyState
                icon="task"
                message={query ? `Nothing in the brain matches “${query}”.` : "The brain is empty."}
              />
            </li>
          ) : null}
          {results.map((doc) => (
            <li
              key={doc.id}
              className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300"
            >
              <div className="flex flex-wrap items-center gap-2">
                {doc.noteDate ? (
                  <span className="font-mono text-xs font-bold text-cyan-700">{doc.noteDate}</span>
                ) : null}
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${KIND_STYLE[doc.kind] ?? KIND_STYLE.meta}`}
                >
                  {doc.folder}
                </span>
                {doc.source === "agent" ? (
                  <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                    agent
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-medium text-slate-900">
                <Link
                  href={`/brain/${doc.slug}`}
                  className="underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                >
                  {doc.title}
                </Link>
              </p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">{doc.path}</p>
            </li>
          ))}
        </ul>
      </section>
    </AppShell>
  );
}
