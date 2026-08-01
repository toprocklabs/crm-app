import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { assignPaymentAccount } from "@/app/actions";
import { AutoSavePaymentAccountField } from "@/components/auto-save-payment-account-field";
import { CrmShell } from "@/components/crm-shell";
import { EmptyState } from "@/components/empty-state";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import {
  paymentStatusLabels,
  paymentStatusPillClasses,
  paymentTypeLabels,
  paymentTypePillClasses,
} from "@/lib/payments/payment-ui";
import { companies, payments, stripeSubscriptions } from "@/lib/schema";

export const dynamic = "force-dynamic";

function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <article className="gong-panel gong-kpi rounded-lg p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-600">{sub}</p> : null}
    </article>
  );
}

export default async function PaymentsPage() {
  const session = await requireUser();
  const db = getDb();

  if (!db) {
    return null;
  }

  const [paymentRows, companyRows, subscriptionRows] = await Promise.all([
    db
      .select({
        id: payments.id,
        amountCents: payments.amountCents,
        feeCents: payments.feeCents,
        refundedCents: payments.refundedCents,
        status: payments.status,
        type: payments.type,
        description: payments.description,
        billingName: payments.billingName,
        billingEmail: payments.billingEmail,
        receiptUrl: payments.receiptUrl,
        paidAt: payments.paidAt,
        companyId: payments.companyId,
        companyName: companies.name,
      })
      .from(payments)
      .leftJoin(companies, eq(payments.companyId, companies.id))
      .where(eq(payments.livemode, true))
      .orderBy(desc(payments.paidAt)),
    db.select({ id: companies.id, name: companies.name }).from(companies).orderBy(companies.name),
    db
      .select({
        monthlyAmountCents: stripeSubscriptions.monthlyAmountCents,
        status: stripeSubscriptions.status,
      })
      .from(stripeSubscriptions),
  ]);

  const settled = paymentRows.filter((p) => p.status !== "failed");
  const netOf = (p: (typeof settled)[number]) => p.amountCents - p.refundedCents;
  const oneOffTotal = settled.filter((p) => p.type === "one_time").reduce((t, p) => t + netOf(p), 0);
  const recurringTotal = settled.filter((p) => p.type === "recurring").reduce((t, p) => t + netOf(p), 0);
  const feesTotal = settled.reduce((t, p) => t + p.feeCents, 0);
  const activeMrr = subscriptionRows
    .filter((s) => s.status === "active" || s.status === "trialing")
    .reduce((t, s) => t + s.monthlyAmountCents, 0);

  const unlinked = settled.filter((p) => !p.companyId);
  const unlinkedTotal = unlinked.reduce((t, p) => t + netOf(p), 0);
  const accountOptions = companyRows.map((c) => ({ value: String(c.id), label: c.name }));

  return (
    <CrmShell
      username={session.username}
      title="Payments"
      description="Every dollar collected through Stripe, matched to the account that paid it."
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total collected" value={money(oneOffTotal + recurringTotal)} sub={`${settled.length} payments`} />
        <Kpi label="Build fees" value={money(oneOffTotal)} sub="One-off implementation" />
        <Kpi label="Recurring" value={money(recurringTotal)} sub="Collected from subscriptions" />
        <Kpi label="Active MRR" value={money(activeMrr)} sub="Billing in Stripe now" />
        <Kpi label="Stripe fees" value={money(feesTotal)} sub={`${money(oneOffTotal + recurringTotal - feesTotal)} net`} />
      </section>

      {unlinked.length > 0 ? (
        <section className="gong-panel rounded-xl border-l-4 border-l-amber-400 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Needs attribution</p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">Unassigned payments</h2>
              <p className="mt-2 text-sm text-slate-600">
                These payments aren&apos;t counted toward any account yet. Assigning one also claims that payer&apos;s
                other unassigned payments.
              </p>
            </div>
            <span className="rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">
              {money(unlinkedTotal)}
            </span>
          </div>
          <ul className="mt-4 space-y-2">
            {unlinked.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{money(payment.amountCents)}</span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${paymentTypePillClasses[payment.type]}`}
                    >
                      {paymentTypeLabels[payment.type]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600">
                    {payment.paidAt ? payment.paidAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                    {" · "}
                    {payment.billingName ?? payment.billingEmail ?? "no payer details on the charge"}
                    {payment.billingName && payment.billingEmail ? ` (${payment.billingEmail})` : ""}
                  </p>
                </div>
                <AutoSavePaymentAccountField
                  paymentId={payment.id}
                  defaultValue=""
                  options={accountOptions}
                  action={assignPaymentAccount}
                  returnPath="/payments"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="gong-panel rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Ledger</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-900">All payments</h2>
          </div>
          <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            {settled.length} total
          </span>
        </div>
        <div className="mt-4 overflow-x-auto">
          {settled.length === 0 ? (
            <EmptyState icon="task" message="No payments synced yet. Run npm run stripe:import." />
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2 pr-4">Payer</th>
                  <th className="py-2 pr-4">Account</th>
                  <th className="py-2">Receipt</th>
                </tr>
              </thead>
              <tbody>
                {settled.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-4 text-slate-600">
                      {payment.paidAt ? payment.paidAt.toLocaleDateString("en-US") : "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="font-medium text-slate-900">{money(payment.amountCents)}</span>
                      {payment.status !== "succeeded" ? (
                        <span
                          className={`ml-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatusPillClasses[payment.status]}`}
                        >
                          {paymentStatusLabels[payment.status]}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${paymentTypePillClasses[payment.type]}`}
                      >
                        {paymentTypeLabels[payment.type]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-slate-600">
                      {payment.billingName ?? payment.billingEmail ?? "—"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {payment.companyId ? (
                        <Link href={`/accounts/${payment.companyId}`} className="text-slate-800 hover:underline">
                          {payment.companyName}
                        </Link>
                      ) : (
                        <AutoSavePaymentAccountField
                          paymentId={payment.id}
                          defaultValue=""
                          options={accountOptions}
                          action={assignPaymentAccount}
                          returnPath="/payments"
                        />
                      )}
                    </td>
                    <td className="py-2.5">
                      {payment.receiptUrl ? (
                        <a
                          href={payment.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-cyan-700 hover:underline"
                        >
                          View
                        </a>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </CrmShell>
  );
}
