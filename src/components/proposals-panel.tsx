import Link from "next/link";
import { desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { proposalStatusLabels, proposalStatusPillClasses } from "@/lib/proposal/status-ui";
import { proposals } from "@/lib/schema";

// Shared "Proposals" panel for account and opportunity detail pages.
export async function ProposalsPanel({
  companyId,
  dealId,
}: {
  companyId?: number;
  dealId?: number;
}) {
  const db = getDb();
  if (!db || (!companyId && !dealId)) {
    return null;
  }

  // Explicit column list — never pull the multi-MB signed PDF base64 here.
  const rows = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      slug: proposals.slug,
      pin: proposals.pin,
      status: proposals.status,
      proposalDate: proposals.proposalDate,
      signerName: proposals.signerName,
      signedAt: proposals.signedAt,
      hasSignedPdf: isNotNull(proposals.signedPdfBase64),
    })
    .from(proposals)
    .where(dealId ? eq(proposals.dealId, dealId) : eq(proposals.companyId, companyId!))
    .orderBy(desc(proposals.createdAt));

  return (
    <article id="proposals-panel" className="gong-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Agreements</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Proposals</h2>
          <p className="mt-2 text-sm text-slate-600">
            Statements of work {dealId ? "for this opportunity" : "for this account"} — send the PIN-gated link, the
            signed PDF lands here.
          </p>
        </div>
        <Link
          href="/proposals"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:border-slate-300 hover:bg-slate-50"
        >
          New proposal
        </Link>
      </div>
      <ul className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No proposals yet.
          </li>
        ) : null}
        {rows.map((proposal) => (
          <li key={proposal.id} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${proposalStatusPillClasses[proposal.status]}`}
                  >
                    {proposalStatusLabels[proposal.status]}
                  </span>
                  {proposal.signedAt ? (
                    <span className="text-xs text-slate-500">
                      Signed {proposal.signedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      {proposal.signerName ? ` by ${proposal.signerName}` : ""}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 font-medium text-slate-900">
                  <Link href={`/proposals/${proposal.id}`} className="underline decoration-slate-300 underline-offset-2">
                    {proposal.title}
                  </Link>
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {proposal.proposalDate} · PIN {proposal.pin}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/p/${proposal.slug}`}
                  target="_blank"
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-cyan-700 hover:bg-slate-50"
                >
                  Client link
                </a>
                {proposal.hasSignedPdf ? (
                  <a
                    href={`/proposals/${proposal.id}/pdf`}
                    className="rounded-md bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Signed PDF
                  </a>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </article>
  );
}
