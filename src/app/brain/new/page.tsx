import Link from "next/link";
import { asc } from "drizzle-orm";
import { createBrainDocument } from "@/app/actions";
import { CrmShell } from "@/components/crm-shell";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { companies } from "@/lib/schema";

export const dynamic = "force-dynamic";

// Create a brain note (plan 007). This is the piece Obsidian was doing that the
// CRM had no answer for — without it the vault can't actually be retired,
// because there'd be nowhere to jot something down.

// Matches the vault's own folders, so authored notes file alongside imported
// ones. Kept in step with ENTITY_FOLDERS in src/lib/brain/frontmatter.ts.
const FOLDERS = [
  { name: "Journal", hint: "a dated entry — what happened today" },
  { name: "Companies", hint: "one note per business" },
  { name: "People", hint: "one note per person" },
  { name: "Projects", hint: "one note per piece of work" },
  { name: "Clients", hint: "client-facing summary" },
  { name: "Meetings", hint: "a dated meeting note" },
  { name: "Delivery", hint: "a dated delivery log" },
  { name: "Pipeline", hint: "a dated pipeline snapshot" },
];

export default async function NewBrainDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ folder?: string; date?: string; companyId?: string }>;
}) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const { folder, date, companyId } = await searchParams;
  const accounts = await db
    .select({ id: companies.id, name: companies.name })
    .from(companies)
    .orderBy(asc(companies.name));

  // Server-rendered, so "today" is the server's day. Good enough for a
  // two-person agency in one timezone; revisit if that ever stops being true.
  const today = new Date().toISOString().slice(0, 10);
  const selectedFolder = folder && FOLDERS.some((f) => f.name === folder) ? folder : "Journal";
  const defaultDate = date === "today" ? today : (date ?? today);
  const isJournal = selectedFolder === "Journal";

  return (
    <CrmShell
      username={session.username}
      title="New note"
      description="Goes straight into the brain — searchable immediately."
    >
      <section className="gong-panel rounded-xl p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/brain" className="text-xs font-semibold text-cyan-700 hover:underline">
            ← Brain
          </Link>
          <Link
            href={`/brain/new?folder=Journal&date=today`}
            className="rounded-full bg-cyan-100 px-3 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-200"
          >
            Today&apos;s journal entry
          </Link>
        </div>

        <form action={createBrainDocument} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Folder</span>
            <select
              name="folder"
              defaultValue={selectedFolder}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              {FOLDERS.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.name} — {f.hint}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Date <span className="font-normal normal-case tracking-normal text-slate-400">(dated folders only)</span>
            </span>
            <input
              type="date"
              name="noteDate"
              defaultValue={defaultDate}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Title</span>
            <input
              name="title"
              required
              minLength={2}
              defaultValue={isJournal ? defaultDate : ""}
              placeholder={isJournal ? defaultDate : "Coatary"}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <label className="text-sm sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Account <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
            </span>
            <select
              name="companyId"
              defaultValue={companyId ?? ""}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
            >
              <option value="">— none —</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Body</span>
            <textarea
              name="bodyMd"
              rows={16}
              spellCheck
              placeholder={"## What happened\n\n- \n\n## Open items\n\n- [ ] "}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-[13px] leading-6 text-slate-900"
            />
            <span className="mt-1 block text-[11px] text-slate-500">
              Markdown. <code className="rounded bg-slate-100 px-1">[[Note name]]</code> links to another note —
              it resolves as soon as that note exists.
            </span>
          </label>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Create note
            </button>
          </div>
        </form>
      </section>
    </CrmShell>
  );
}
