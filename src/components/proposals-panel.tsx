import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { updateProposalDeal, updateProposalPin } from "@/app/actions";
import { AutoSaveProposalDealField } from "@/components/auto-save-proposal-deal-field";
import { AutoSaveProposalPinField } from "@/components/auto-save-proposal-pin-field";
import { getDb } from "@/lib/db";
import { hasSignedPdfExpr } from "@/lib/proposal/has-signed-pdf";
import { proposalStatusLabels, proposalStatusPillClasses } from "@/lib/proposal/status-ui";
import { deals, proposals } from "@/lib/schema";

// Shared "Proposals" panel for account and opportunity detail pages. Always
// shows the whole account's SOWs with a per-row opportunity dropdown so any
// proposal can be tied/re-tied; on an opportunity page (dealId set) that
// opportunity's proposals sort first.
export async function ProposalsPanel({
  companyId,
  dealId,
}: {
  companyId?: number | null;
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
      dealId: proposals.dealId,
      proposalDate: proposals.proposalDate,
      signerName: proposals.signerName,
      signedAt: proposals.signedAt,
      hasSignedPdf: hasSignedPdfExpr,
    })
    .from(proposals)
    .where(companyId ? eq(proposals.companyId, companyId) : eq(proposals.dealId, dealId!))
    .orderBy(desc(proposals.createdAt));

  if (dealId) {
    rows.sort((a, b) => Number(b.dealId === dealId) - Number(a.dealId === dealId));
  }

  const companyDeals = companyId
    ? await db
        .select({ id: deals.id, name: deals.name })
        .from(deals)
        .where(eq(deals.companyId, companyId))
        .orderBy(desc(deals.createdAt))
    : [];
  const dealOptions = companyDeals.map((deal) => ({ value: String(deal.id), label: deal.name }));
  const returnPath = dealId ? `/opportunities/${dealId}` : `/accounts/${companyId}`;

  return (
    <article id="proposals-panel" className="gong-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Agreements</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Proposals</h2>
          <p className="mt-2 text-sm text-slate-600">
            Statements of work for this account — use the dropdown to tie each one to an opportunity; the signed PDF
            lands here.
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
        {rows.map((proposal) => {
          const tiedToThisDeal = dealId != null && proposal.dealId === dealId;
          return (
            <li
              key={proposal.id}
              className={`rounded-xl border p-4 ${
                tiedToThisDeal ? "border-cyan-200 bg-cyan-50/40" : "border-slate-200 bg-slate-50/70"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${proposalStatusPillClasses[proposal.status]}`}
                    >
                      {proposalStatusLabels[proposal.status]}
                    </span>
                    {tiedToThisDeal ? (
                      <span className="inline-flex rounded-full bg-cyan-100 px-2.5 py-1 text-xs font-semibold text-cyan-800">
                        This opportunity
                      </span>
                    ) : null}
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
                  {/* div, not p: the PIN editor renders a <form>, which is invalid
                      inside <p> and causes a hydration mismatch. */}
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <span>{proposal.proposalDate} · PIN</span>
                    <AutoSaveProposalPinField
                      proposalId={proposal.id}
                      defaultValue={proposal.pin}
                      action={updateProposalPin}
                      returnPath={returnPath}
                    />
                  </div>
                  {companyId ? (
                    <div className="mt-2">
                      <AutoSaveProposalDealField
                        proposalId={proposal.id}
                        defaultValue={proposal.dealId ? String(proposal.dealId) : ""}
                        options={dealOptions}
                        action={updateProposalDeal}
                        returnPath={returnPath}
                      />
                    </div>
                  ) : null}
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
          );
        })}
      </ul>
    </article>
  );
}
