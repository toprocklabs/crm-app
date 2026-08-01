import { and, desc, eq, inArray, sql as sqlExpr } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { money } from "@/lib/format";
import { reconcileOneOff, reconcileRecurring } from "@/lib/payments/reconcile";
import {
  paymentStatusLabels,
  paymentStatusPillClasses,
  paymentTypeLabels,
  paymentTypePillClasses,
  subscriptionStatusPillClasses,
} from "@/lib/payments/payment-ui";
import { deals, payments, stripeSubscriptions } from "@/lib/schema";

// Billing panel for account (and opportunity) detail pages. Answers the two
// questions from plan 003: what has this client paid, and does that match what
// they agreed to — split by payment type, because build fees and maintenance
// reconcile differently.
export async function BillingPanel({ companyId }: { companyId: number }) {
  const db = getDb();
  if (!db) {
    return null;
  }

  const [paymentRows, subscriptionRows, dealTotals] = await Promise.all([
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
        receiptUrl: payments.receiptUrl,
        paidAt: payments.paidAt,
      })
      .from(payments)
      .where(and(eq(payments.companyId, companyId), eq(payments.livemode, true)))
      .orderBy(desc(payments.paidAt)),
    db
      .select({
        id: stripeSubscriptions.id,
        status: stripeSubscriptions.status,
        monthlyAmountCents: stripeSubscriptions.monthlyAmountCents,
        interval: stripeSubscriptions.interval,
        currentPeriodEnd: stripeSubscriptions.currentPeriodEnd,
      })
      .from(stripeSubscriptions)
      .where(eq(stripeSubscriptions.companyId, companyId)),
    db
      .select({
        expectedMrrCents: sqlExpr<number>`coalesce(sum(${deals.valueCents}), 0)`,
        contractedOneOffCents: sqlExpr<number>`coalesce(sum(${deals.implementationCostCents}), 0)`,
      })
      .from(deals)
      .where(and(eq(deals.companyId, companyId), inArray(deals.stage, ["won"]))),
  ]);

  const settled = paymentRows.filter((p) => p.status !== "failed");
  const netOf = (p: (typeof settled)[number]) => p.amountCents - p.refundedCents;
  const collectedOneOff = settled.filter((p) => p.type === "one_time").reduce((t, p) => t + netOf(p), 0);
  const collectedRecurring = settled.filter((p) => p.type === "recurring").reduce((t, p) => t + netOf(p), 0);
  const lifetimePaid = collectedOneOff + collectedRecurring;
  const totalFees = settled.reduce((t, p) => t + p.feeCents, 0);

  const activeSubs = subscriptionRows.filter((s) => s.status === "active" || s.status === "trialing");
  const actualMrr = activeSubs.reduce((t, s) => t + s.monthlyAmountCents, 0);

  const totals = dealTotals[0] ?? { expectedMrrCents: 0, contractedOneOffCents: 0 };
  const recurring = reconcileRecurring(Number(totals.expectedMrrCents), actualMrr);
  const oneOff = reconcileOneOff(Number(totals.contractedOneOffCents), collectedOneOff);

  return (
    <article id="billing-panel" className="gong-panel rounded-xl p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Billing</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">Payments</h2>
          <p className="mt-2 text-sm text-slate-600">
            What this account has actually paid, from Stripe — checked against what they agreed to.
          </p>
        </div>
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-right">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Lifetime paid</p>
          <p className="mt-1 text-2xl font-semibold text-slate-950">{money(lifetimePaid)}</p>
          {totalFees > 0 ? (
            <p className="text-xs text-slate-500">{money(lifetimePaid - totalFees)} net of fees</p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {/* Recurring: an equality check — a plan either bills at the agreed rate or it doesn't. */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Monthly maintenance</p>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${recurring.tone}`}>
              {recurring.label}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-950">{money(recurring.actualCents)}</span>
            <span className="text-sm text-slate-500">/mo billing</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {money(recurring.expectedCents)}/mo agreed
            {recurring.deltaCents !== 0 ? (
              <span className={recurring.deltaCents < 0 ? "font-medium text-red-700" : "font-medium text-amber-700"}>
                {" "}
                · {recurring.deltaCents < 0 ? "−" : "+"}
                {money(Math.abs(recurring.deltaCents))}/mo
              </span>
            ) : null}
          </p>
          {activeSubs.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {activeSubs.map((sub) => (
                <li key={sub.id} className="flex items-center gap-2 text-xs text-slate-600">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 font-semibold ${subscriptionStatusPillClasses[sub.status] ?? "bg-slate-100 text-slate-700"}`}
                  >
                    {sub.status}
                  </span>
                  {money(sub.monthlyAmountCents)}/mo
                  {sub.currentPeriodEnd ? ` · renews ${sub.currentPeriodEnd.toLocaleDateString("en-US")}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No active subscription in Stripe.</p>
          )}
        </div>

        {/* One-off: progress, not equality — build fees bill as deposit + phases. */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Build fee</p>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${oneOff.tone}`}>
              {oneOff.label}
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-semibold text-slate-950">{money(oneOff.collectedCents)}</span>
            <span className="text-sm text-slate-500">of {money(oneOff.contractedCents)}</span>
          </div>
          {oneOff.contractedCents > 0 ? (
            <>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${oneOff.state === "complete" ? "bg-emerald-500" : "bg-sky-500"}`}
                  style={{ width: `${oneOff.percent}%` }}
                />
              </div>
              <p className="mt-1 text-sm text-slate-600">
                {oneOff.remainingCents > 0 ? (
                  <span className="font-medium text-slate-800">{money(oneOff.remainingCents)} remaining</span>
                ) : (
                  "Fully collected"
                )}
              </p>
            </>
          ) : (
            <p className="mt-2 text-xs text-slate-500">No implementation fee recorded on won opportunities.</p>
          )}
          {collectedRecurring > 0 ? (
            <p className="mt-2 text-xs text-slate-500">
              Plus {money(collectedRecurring)} collected in recurring payments.
            </p>
          ) : null}
        </div>
      </div>

      <ul className="mt-4 space-y-2">
        {settled.length === 0 ? (
          <li className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
            No payments attributed to this account yet.
          </li>
        ) : null}
        {settled.map((payment) => (
          <li
            key={payment.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">{money(payment.amountCents)}</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${paymentTypePillClasses[payment.type]}`}
                >
                  {paymentTypeLabels[payment.type]}
                </span>
                {payment.status !== "succeeded" ? (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${paymentStatusPillClasses[payment.status]}`}
                  >
                    {paymentStatusLabels[payment.status]}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {payment.paidAt ? payment.paidAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                {payment.billingName ? ` · ${payment.billingName}` : ""}
                {payment.description ? ` · ${payment.description}` : ""}
              </p>
            </div>
            {payment.receiptUrl ? (
              <a
                href={payment.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-cyan-700 hover:bg-slate-50"
              >
                Receipt
              </a>
            ) : null}
          </li>
        ))}
      </ul>
    </article>
  );
}
