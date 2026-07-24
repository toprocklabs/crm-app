import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq, isNotNull } from "drizzle-orm";
import { updateProposal } from "@/app/actions";
import { CrmShell } from "@/components/crm-shell";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { proposalStatusLabels, proposalStatusOptions, proposalStatusPillClasses } from "@/lib/proposal/status-ui";
import { companies, contacts, deals, proposals } from "@/lib/schema";

export const dynamic = "force-dynamic";

export default async function ProposalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const { id } = await params;
  const proposalId = Number(id);
  if (!Number.isInteger(proposalId) || proposalId <= 0) {
    notFound();
  }

  // Explicit column list — never pull the multi-MB signed PDF base64 here.
  const [proposal] = await db
    .select({
      id: proposals.id,
      companyId: proposals.companyId,
      dealId: proposals.dealId,
      contactId: proposals.contactId,
      title: proposals.title,
      slug: proposals.slug,
      pin: proposals.pin,
      status: proposals.status,
      clientName: proposals.clientName,
      business: proposals.business,
      proposalDate: proposals.proposalDate,
      contentMd: proposals.contentMd,
      signerName: proposals.signerName,
      signerEmail: proposals.signerEmail,
      signedAt: proposals.signedAt,
      sentAt: proposals.sentAt,
      firstViewedAt: proposals.firstViewedAt,
      hasSignedPdf: isNotNull(proposals.signedPdfBase64),
    })
    .from(proposals)
    .where(eq(proposals.id, proposalId))
    .limit(1);
  if (!proposal) {
    notFound();
  }

  const [company, dealRows, contactRows] = await Promise.all([
    db.query.companies.findFirst({ where: eq(companies.id, proposal.companyId) }),
    db.select({ id: deals.id, name: deals.name }).from(deals).orderBy(desc(deals.createdAt)),
    db
      .select({ id: contacts.id, firstName: contacts.firstName, lastName: contacts.lastName })
      .from(contacts)
      .orderBy(contacts.firstName),
  ]);

  const returnPath = `/proposals/${proposal.id}`;

  return (
    <CrmShell
      username={session.username}
      title={proposal.title}
      description={`Proposal for ${company?.name ?? proposal.business} — shareable at /p/${proposal.slug} (PIN ${proposal.pin}).`}
    >
      <section className="grid gap-6 lg:grid-cols-3">
        <article className="gong-panel rounded-xl p-5 lg:col-span-1">
          <h2 className="text-lg font-semibold text-slate-900">Status &amp; links</h2>
          <div className="mt-3 space-y-3 text-sm">
            <p>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${proposalStatusPillClasses[proposal.status]}`}
              >
                {proposalStatusLabels[proposal.status]}
              </span>
            </p>
            <p className="text-slate-600">
              Account:{" "}
              <Link href={`/accounts/${proposal.companyId}`} className="font-medium text-slate-900 hover:underline">
                {company?.name ?? proposal.business}
              </Link>
            </p>
            <p className="text-slate-600">
              Client link:{" "}
              <a href={`/p/${proposal.slug}`} target="_blank" className="font-semibold text-cyan-700 hover:underline">
                /p/{proposal.slug}
              </a>
            </p>
            <p className="text-slate-600">
              Client PIN: <span className="font-mono font-semibold text-slate-900">{proposal.pin}</span>
            </p>
            {proposal.sentAt ? (
              <p className="text-slate-600">Sent {proposal.sentAt.toLocaleDateString("en-US")}</p>
            ) : null}
            {proposal.firstViewedAt ? (
              <p className="text-slate-600">First viewed {proposal.firstViewedAt.toLocaleDateString("en-US")}</p>
            ) : null}
            {proposal.signedAt ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="font-medium text-emerald-900">
                  Signed by {proposal.signerName ?? "client"} on {proposal.signedAt.toLocaleDateString("en-US")}
                </p>
                {proposal.signerEmail ? <p className="text-xs text-emerald-800">{proposal.signerEmail}</p> : null}
                {proposal.hasSignedPdf ? (
                  <a
                    href={`/proposals/${proposal.id}/pdf`}
                    className="mt-2 inline-flex rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                  >
                    Download signed PDF
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-emerald-800">No PDF stored for this signature.</p>
                )}
              </div>
            ) : null}
          </div>
        </article>

        <article className="gong-panel rounded-xl p-5 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Edit proposal</h2>
          <form action={updateProposal} className="mt-4 space-y-3">
            <input type="hidden" name="proposalId" value={proposal.id} />
            <input type="hidden" name="returnPath" value={returnPath} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Title</span>
                <input name="title" defaultValue={proposal.title} required className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Status</span>
                <select name="status" defaultValue={proposal.status} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                  {proposalStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {proposalStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Client contact name</span>
                <input name="clientName" defaultValue={proposal.clientName} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Business display name</span>
                <input name="business" defaultValue={proposal.business} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Display date</span>
                <input name="proposalDate" defaultValue={proposal.proposalDate} placeholder="April 11, 2026" className="rounded-md border border-slate-300 px-3 py-2 text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Client PIN</span>
                <input name="pin" defaultValue={proposal.pin} required maxLength={6} className="rounded-md border border-slate-300 px-3 py-2 font-mono text-slate-900" />
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Opportunity</span>
                <select name="dealId" defaultValue={proposal.dealId ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                  <option value="">None</option>
                  {dealRows.map((deal) => (
                    <option key={deal.id} value={deal.id}>
                      {deal.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                <span>Signer contact</span>
                <select name="contactId" defaultValue={proposal.contactId ?? ""} className="rounded-md border border-slate-300 px-3 py-2 text-slate-900">
                  <option value="">None</option>
                  {contactRows.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.firstName} {contact.lastName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              <span>Content (markdown: ## Overview, ## Pricing, ## What&apos;s Included, ## Notes)</span>
              <textarea
                name="contentMd"
                defaultValue={proposal.contentMd}
                rows={18}
                spellCheck={false}
                className="rounded-md border border-slate-300 px-3 py-2 font-mono text-[13px] leading-relaxed text-slate-900"
              />
            </label>
            <button type="submit" className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Save proposal
            </button>
          </form>
        </article>
      </section>
    </CrmShell>
  );
}
