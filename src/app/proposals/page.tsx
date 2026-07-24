import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { createProposal, updateProposalPin } from "@/app/actions";
import { AutoSaveProposalPinField } from "@/components/auto-save-proposal-pin-field";
import { CollapsibleFormSection } from "@/components/collapsible-form-section";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { proposalStatusLabels, proposalStatusPillClasses } from "@/lib/proposal/status-ui";
import { companies, deals, proposals } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function ProposalsPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const [proposalRows, companyRows, dealRows] = await Promise.all([
    db
      .select({
        id: proposals.id,
        title: proposals.title,
        slug: proposals.slug,
        pin: proposals.pin,
        status: proposals.status,
        business: proposals.business,
        proposalDate: proposals.proposalDate,
        signedAt: proposals.signedAt,
        companyId: proposals.companyId,
        companyName: companies.name,
        dealName: deals.name,
      })
      .from(proposals)
      .leftJoin(companies, eq(proposals.companyId, companies.id))
      .leftJoin(deals, eq(proposals.dealId, deals.id))
      .orderBy(desc(proposals.createdAt)),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(companies.name),
    db.select({ id: deals.id, name: deals.name }).from(deals).orderBy(desc(deals.createdAt)),
  ]);

  const signedCount = proposalRows.filter((p) => p.status === "signed").length;
  const outstandingCount = proposalRows.filter((p) => p.status === "sent" || p.status === "viewed").length;

  return (
    <CrmShell
      username={session.username}
      title="Proposals"
      description="Statements of work tied to accounts: draft, send the PIN-gated link, and track signatures."
    >
      <section className="grid gap-6 lg:grid-cols-3">
        <CollapsibleFormSection
          title="New proposal"
          description="Expand to draft a proposal against an account."
          className="lg:col-span-1"
        >
          <form action={createProposal}>
            <input type="hidden" name="returnPath" value="/proposals" />
            <div className="space-y-3">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Account</span>
                <select name="companyId" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                  <option value="">— New account (name below) —</option>
                  {companyRows.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>New account name</span>
                <input
                  name="newAccountName"
                  placeholder="Creates the account if it doesn't exist"
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Title</span>
                <input
                  name="title"
                  required
                  placeholder="Website build + intake automation"
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Client contact name</span>
                <input name="clientName" placeholder="First Last" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Business display name</span>
                <input
                  name="business"
                  placeholder="Defaults to the account name"
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Opportunity</span>
                <select name="dealId" defaultValue="auto" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                  <option value="auto">Auto-create from this proposal</option>
                  <option value="">None</option>
                  {dealRows.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Client PIN</span>
                <input
                  name="pin"
                  placeholder="Blank = generated"
                  maxLength={6}
                  className="rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </label>
            </div>
            <button type="submit" className="mt-4 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Create proposal
            </button>
            <p className="mt-2 text-xs text-slate-500">
              Content (overview, pricing, inclusions) is edited on the proposal page after creation.
            </p>
          </form>
        </CollapsibleFormSection>

        <article className="gong-panel rounded-xl p-5 lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">All proposals</h2>
              <p className="mt-1 text-sm text-slate-600">
                {signedCount} signed · {outstandingCount} awaiting signature
              </p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
              {proposalRows.length} total
            </span>
          </div>
          <div className="mt-4 overflow-x-auto">
            {proposalRows.length === 0 ? (
              <EmptyState icon="task" message="No proposals yet. Create one to get started." />
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4">Proposal</th>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">PIN</th>
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2">Link</th>
                  </tr>
                </thead>
                <tbody>
                  {proposalRows.map((proposal) => (
                    <tr key={proposal.id} className="border-b border-slate-100">
                      <td className="py-2.5 pr-4">
                        <Link href={`/proposals/${proposal.id}`} className="font-medium text-slate-900 hover:underline">
                          {proposal.title}
                        </Link>
                        {proposal.dealName ? (
                          <p className="text-xs text-slate-500">{proposal.dealName}</p>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-4 text-slate-700">
                        <Link href={`/accounts/${proposal.companyId}`} className="hover:underline">
                          {proposal.companyName ?? proposal.business}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${proposalStatusPillClasses[proposal.status]}`}
                        >
                          {proposalStatusLabels[proposal.status]}
                        </span>
                        {proposal.signedAt ? (
                          <p className="mt-1 text-xs text-slate-500">
                            {proposal.signedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2.5 pr-4">
                        <AutoSaveProposalPinField
                          proposalId={proposal.id}
                          defaultValue={proposal.pin}
                          action={updateProposalPin}
                          returnPath="/proposals"
                        />
                      </td>
                      <td className="py-2.5 pr-4 text-slate-600">{proposal.proposalDate}</td>
                      <td className="py-2.5">
                        <a
                          href={`/p/${proposal.slug}`}
                          target="_blank"
                          className="text-xs font-semibold text-cyan-700 hover:underline"
                        >
                          /p/{proposal.slug}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>
      </section>
    </CrmShell>
  );
}
