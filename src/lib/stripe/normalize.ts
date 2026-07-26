import type Stripe from "stripe";
import type { PaymentStatus, PaymentType } from "@/lib/schema";

// Pure mapping from Stripe objects to our mirror rows. Kept free of DB and
// network calls so the fiddly parts (interval math, refund states) can be
// reasoned about and tested in isolation.

/**
 * Normalize any Stripe billing interval to a monthly figure in cents, so
 * subscription amounts compare directly against deals.valueCents (an MRR).
 * A yearly $1,200 plan and a monthly $100 plan both become 10000.
 */
export function toMonthlyCents(
  amountCents: number,
  interval: Stripe.Price.Recurring.Interval | string | null | undefined,
  intervalCount = 1,
): number {
  const count = intervalCount > 0 ? intervalCount : 1;
  const perInterval = amountCents / count;

  switch (interval) {
    case "month":
      return Math.round(perInterval);
    case "year":
      return Math.round(perInterval / 12);
    case "week":
      return Math.round((perInterval * 52) / 12);
    case "day":
      return Math.round((perInterval * 365) / 12);
    default:
      // Unknown/absent interval: treat as already-monthly rather than
      // silently zeroing out real revenue.
      return Math.round(perInterval);
  }
}

/** Sum a subscription's items into a single normalized monthly amount. */
export function subscriptionMonthlyCents(subscription: Stripe.Subscription): number {
  return subscription.items.data.reduce((total, item) => {
    const unit = item.price.unit_amount ?? 0;
    const quantity = item.quantity ?? 1;
    return (
      total +
      toMonthlyCents(
        unit * quantity,
        item.price.recurring?.interval,
        item.price.recurring?.interval_count ?? 1,
      )
    );
  }, 0);
}

/** The display interval for a subscription — its first item's interval. */
export function subscriptionInterval(subscription: Stripe.Subscription): string | null {
  return subscription.items.data[0]?.price.recurring?.interval ?? null;
}

export function paymentStatusForCharge(charge: Stripe.Charge): PaymentStatus {
  if (!charge.paid || charge.status === "failed") {
    return "failed";
  }
  if (charge.refunded) {
    return "refunded";
  }
  if ((charge.amount_refunded ?? 0) > 0) {
    return "partially_refunded";
  }
  return "succeeded";
}

// Stripe's expandable fields arrive as either a bare id or the full object
// depending on what we expanded; these normalize both shapes to an id.
function idOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function resolveCustomerId(charge: Stripe.Charge): string | null {
  return idOf(charge.customer as string | { id: string } | null);
}

export function resolvePaymentIntentId(charge: Stripe.Charge): string | null {
  return idOf(charge.payment_intent as string | { id: string } | null);
}

/**
 * What a charge is attached to. As of API 2026-06-24 a Charge no longer
 * carries an `invoice` field — the linkage runs the other way, from
 * Invoice.parent.subscription_details plus Invoice.payments. So we build this
 * index from the invoice sweep and look charges up in it.
 */
export type ChargeLink = {
  invoiceId: string | null;
  subscriptionId: string | null;
};

/** Keys a charge can be found under in the link index. */
export function chargeLookupKeys(charge: Stripe.Charge): string[] {
  return [charge.id, resolvePaymentIntentId(charge)].filter(
    (key): key is string => Boolean(key),
  );
}

/**
 * Index invoices by the charge / payment-intent that settled them, so each
 * charge can be classified as recurring or one-off. Pure: takes the already
 * fetched invoice list, does no I/O.
 */
export function buildChargeLinkIndex(invoices: Stripe.Invoice[]): Map<string, ChargeLink> {
  const index = new Map<string, ChargeLink>();

  for (const invoice of invoices) {
    const subscriptionId =
      invoice.parent?.type === "subscription_details"
        ? idOf(invoice.parent.subscription_details?.subscription)
        : null;

    const link: ChargeLink = { invoiceId: invoice.id ?? null, subscriptionId };

    for (const invoicePayment of invoice.payments?.data ?? []) {
      const key =
        idOf(invoicePayment.payment.payment_intent) ??
        idOf(invoicePayment.payment.charge);
      if (key) {
        index.set(key, link);
      }
    }
  }

  return index;
}

/** Find a charge's invoice/subscription linkage in the index. */
export function linkForCharge(
  charge: Stripe.Charge,
  index: Map<string, ChargeLink>,
): ChargeLink | null {
  for (const key of chargeLookupKeys(charge)) {
    const link = index.get(key);
    if (link) return link;
  }
  return null;
}

/**
 * A charge settling a subscription invoice is recurring maintenance; anything
 * else is a one-off build fee. Derived from Stripe's own data rather than
 * entered, so the classification can't drift out of sync with billing.
 */
export function paymentTypeForCharge(link: ChargeLink | null): PaymentType {
  return link?.subscriptionId ? "recurring" : "one_time";
}

/** Stripe's fee for a charge, when the balance transaction was expanded. */
export function resolveFeeCents(charge: Stripe.Charge): number {
  const txn = charge.balance_transaction;
  if (txn && typeof txn !== "string") {
    return (txn as Stripe.BalanceTransaction).fee ?? 0;
  }
  return 0;
}

export type PaymentRow = {
  stripeChargeId: string;
  stripeCustomerId: string | null;
  amountCents: number;
  feeCents: number;
  refundedCents: number;
  currency: string;
  status: PaymentStatus;
  type: PaymentType;
  description: string | null;
  receiptUrl: string | null;
  stripeInvoiceId: string | null;
  stripeSubscriptionId: string | null;
  livemode: boolean;
  paidAt: Date;
};

/**
 * Map a Stripe charge to the row we store. `link` comes from
 * buildChargeLinkIndex() and decides whether this is recurring or one-off.
 */
export function chargeToPaymentRow(
  charge: Stripe.Charge,
  link: ChargeLink | null = null,
): PaymentRow {
  return {
    stripeChargeId: charge.id,
    stripeCustomerId: resolveCustomerId(charge),
    amountCents: charge.amount ?? 0,
    feeCents: resolveFeeCents(charge),
    refundedCents: charge.amount_refunded ?? 0,
    currency: charge.currency ?? "usd",
    status: paymentStatusForCharge(charge),
    type: paymentTypeForCharge(link),
    description: charge.description ?? null,
    receiptUrl: charge.receipt_url ?? null,
    stripeInvoiceId: link?.invoiceId ?? null,
    stripeSubscriptionId: link?.subscriptionId ?? null,
    livemode: charge.livemode ?? true,
    paidAt: new Date((charge.created ?? 0) * 1000),
  };
}
