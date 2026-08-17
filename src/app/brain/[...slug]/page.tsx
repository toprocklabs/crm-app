import Link from "next/link";
import { notFound } from "next/navigation";
import { updateBrainDocumentField } from "@/app/actions";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { AppShell } from "@/components/app-shell";
import { MarkdownBodyEditor } from "@/components/markdown-body-editor";
import { MeetingBody } from "@/components/meeting-body";
import { requireUser } from "@/lib/auth";
import { getBrainDocument, listBacklinks, outboundLinkTargets } from "@/lib/brain/queries";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// One brain note (plan 007). The only route that reads `body_md`.
//
// The slug is a catch-all because it carries a folder: "companies/coatary".
// Vault filenames contain spaces and dots, which is exactly why `slug` exists
// as a separate column from `path`.

export default async function BrainDocumentPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const { slug: segments } = await params;
  const slug = segments.map(decodeURIComponent).join("/");

  const doc = await getBrainDocument(db, slug);
  if (!doc) {
    notFound();
  }

  const [targets, backlinks] = await Promise.all([
    outboundLinkTargets(db, doc.id),
    listBacklinks(db, doc.id),
  ]);

  // Resolve [[wiki-links]] against this note's own outbound links, which the
  // importer already resolved. A target absent from the map is dangling and the
  // renderer marks it up rather than linking nowhere.
  const linkForTarget = (target: string) => {
    const found = targets.get(target.toLowerCase());
    return found ? `/brain/${found}` : null;
  };

  const frontmatterEntries = Object.entries(
    (doc.frontmatter ?? {}) as Record<string, string | string[]>,
  ).filter(([, value]) => (Array.isArray(value) ? value.length > 0 : String(value).trim() !== ""));

  return (
    <AppShell username={session.username} title={doc.title} description={doc.path}>
      <div className="space-y-4">
        <section className="gong-panel rounded-xl p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/brain" className="text-xs font-semibold text-cyan-700 hover:underline">
              ← Brain
            </Link>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {doc.folder}
            </span>
            {doc.noteDate ? (
              <span className="font-mono text-xs font-bold text-cyan-700">{doc.noteDate}</span>
            ) : null}
            {doc.companyId ? (
              <Link
                href={`/accounts/${doc.companyId}`}
                className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-200"
              >
                {doc.companyName}
              </Link>
            ) : (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                no account
              </span>
            )}
            {doc.source === "agent" ? (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700">
                written by an agent
              </span>
            ) : null}
          </div>

          {frontmatterEntries.length ? (
            <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 border-t border-slate-200 pt-3 text-xs">
              {frontmatterEntries.map(([key, value]) => (
                <div key={key} className="flex gap-1.5">
                  <dt className="font-semibold uppercase tracking-[0.08em] text-slate-400">{key}</dt>
                  <dd className="text-slate-700">{Array.isArray(value) ? value.join(", ") : value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </section>

        <section className="gong-panel rounded-xl p-5">
          <MeetingBody markdown={doc.bodyMd} linkForTarget={linkForTarget} />
        </section>

        <CollapsibleFormSection title="Edit note" description="Markdown, saves when you click away">
          <MarkdownBodyEditor
            idName="documentId"
            idValue={doc.id}
            defaultValue={doc.bodyMd}
            action={updateBrainDocumentField}
            returnPath={`/brain/${doc.slug}`}
            hint={
              <>
                , <code className="rounded bg-slate-100 px-1">[[wiki-links]]</code>,{" "}
                <code className="rounded bg-slate-100 px-1">- [ ]</code> tasks
              </>
            }
          />
        </CollapsibleFormSection>

        <section className="gong-panel rounded-xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Linked from {backlinks.length} note{backlinks.length === 1 ? "" : "s"}
          </p>
          {backlinks.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nothing links here yet.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {backlinks.map((source) => (
                <li key={source.id} className="text-sm">
                  <Link
                    href={`/brain/${source.slug}`}
                    className="text-slate-800 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
                  >
                    {source.title}
                  </Link>
                  <span className="ml-2 text-xs text-slate-400">{source.folder}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
