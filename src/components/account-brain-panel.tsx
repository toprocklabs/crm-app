import Link from "next/link";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";

// Brain notes attached to one account (plan 007).
//
// Collapsed, and deliberately below the meetings timeline: the account page
// leads with money then conversations, and that ordering is the whole point of
// plan 006. This is supporting context, not a third headline.

export type AccountBrainDocument = {
  id: number;
  slug: string;
  title: string;
  kind: string;
  folder: string;
  noteDate: string | null;
  source: string;
};

export function AccountBrainPanel({
  companyId,
  documents,
}: {
  companyId: number;
  documents: AccountBrainDocument[];
}) {
  if (documents.length === 0) {
    return null;
  }

  return (
    <CollapsibleFormSection
      title={`Brain notes (${documents.length})`}
      description="Imported from the vault — companies, people and projects"
    >
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-wrap items-baseline gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
          >
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
              {doc.folder}
            </span>
            {doc.noteDate ? (
              <span className="font-mono text-[11px] font-bold text-cyan-700">{doc.noteDate}</span>
            ) : null}
            <Link
              href={`/brain/${doc.slug}`}
              className="flex-1 text-sm text-slate-800 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500"
            >
              {doc.title}
            </Link>
            {doc.source === "agent" ? (
              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                agent
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-500">
        <Link href={`/brain/new?companyId=${companyId}`} className="font-semibold text-cyan-700 hover:underline">
          Add a note
        </Link>{" "}
        · <Link href="/brain" className="hover:underline">search the whole brain</Link>
      </p>
    </CollapsibleFormSection>
  );
}
