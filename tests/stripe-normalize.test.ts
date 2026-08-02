import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type Stripe from "stripe";
import {
  buildChargeLinkIndex,
  linkForCharge,
  paymentStatusForCharge,
  paymentTypeForCharge,
  resolveFeeCents,
  subscriptionMonthlyCents,
  toMonthlyCents,
} from "@/lib/stripe/normalize";

// These helpers take large Stripe SDK shapes but only read a few fields.
// Casting minimal literals keeps the fixtures readable.
const charge = (fields: Partial<Stripe.Charge>) => fields as Stripe.Charge;
const subscription = (items: Array<Partial<Stripe.SubscriptionItem>>) =>
  ({ items: { data: items } }) as Stripe.Subscription;

// The whole revenue reconciliation rests on this: deals.valueCents is an MRR,
// so every Stripe interval has to collapse to a monthly figure first.
describe("toMonthlyCents", () => {
  it("passes monthly amounts through", () => {
    assert.equal(toMonthlyCents(21500, "month"), 21500);
  });

  it("divides yearly amounts by twelve", () => {
    assert.equal(toMonthlyCents(120000, "year"), 10000);
  });

  it("divides by interval_count for multi-interval plans", () => {
    // Quarterly: $300 every 3 months = $100/mo.
    assert.equal(toMonthlyCents(30000, "month", 3), 10000);
    // Biennial: $2,400 every 2 years = $100/mo.
    assert.equal(toMonthlyCents(240000, "year", 2), 10000);
  });

  it("converts weekly and daily intervals", () => {
    assert.equal(toMonthlyCents(10000, "week"), Math.round((10000 * 52) / 12));
    assert.equal(toMonthlyCents(1000, "day"), Math.round((1000 * 365) / 12));
  });

  it("treats an unknown or absent interval as already monthly", () => {
    assert.equal(toMonthlyCents(5000, null), 5000);
    assert.equal(toMonthlyCents(5000, undefined), 5000);
    assert.equal(toMonthlyCents(5000, "fortnight"), 5000);
  });

  it("guards against a zero or negative interval_count", () => {
    assert.equal(toMonthlyCents(10000, "month", 0), 10000);
    assert.equal(toMonthlyCents(10000, "month", -3), 10000);
  });

  it("rounds to whole cents", () => {
    // $100/yr = 8.333 cents/mo -> 833
    assert.equal(toMonthlyCents(10000, "year"), 833);
  });
});

describe("subscriptionMonthlyCents", () => {
  it("sums items, normalizing each to monthly", () => {
    const sub = subscription([
      { price: { unit_amount: 21500, recurring: { interval: "month", interval_count: 1 } }, quantity: 1 },
      { price: { unit_amount: 120000, recurring: { interval: "year", interval_count: 1 } }, quantity: 1 },
    ] as unknown as Array<Partial<Stripe.SubscriptionItem>>);

    assert.equal(subscriptionMonthlyCents(sub), 21500 + 10000);
  });

  it("multiplies by quantity", () => {
    const sub = subscription([
      { price: { unit_amount: 5000, recurring: { interval: "month", interval_count: 1 } }, quantity: 3 },
    ] as unknown as Array<Partial<Stripe.SubscriptionItem>>);

    assert.equal(subscriptionMonthlyCents(sub), 15000);
  });

  it("defaults a missing quantity to one and a missing amount to zero", () => {
    const sub = subscription([
      { price: { unit_amount: 5000, recurring: { interval: "month", interval_count: 1 } } },
      { price: { unit_amount: null, recurring: { interval: "month", interval_count: 1 } }, quantity: 2 },
    ] as unknown as Array<Partial<Stripe.SubscriptionItem>>);

    assert.equal(subscriptionMonthlyCents(sub), 5000);
  });

  it("is zero for a subscription with no items", () => {
    assert.equal(subscriptionMonthlyCents(subscription([])), 0);
  });
});

describe("paymentStatusForCharge", () => {
  it("maps an unpaid or failed charge to failed", () => {
    assert.equal(paymentStatusForCharge(charge({ paid: false, status: "succeeded" })), "failed");
    assert.equal(paymentStatusForCharge(charge({ paid: true, status: "failed" })), "failed");
  });

  it("maps a fully refunded charge to refunded", () => {
    assert.equal(
      paymentStatusForCharge(charge({ paid: true, status: "succeeded", refunded: true })),
      "refunded",
    );
  });

  it("maps a partial refund", () => {
    assert.equal(
      paymentStatusForCharge(
        charge({ paid: true, status: "succeeded", refunded: false, amount_refunded: 500 }),
      ),
      "partially_refunded",
    );
  });

  it("maps a clean charge to succeeded", () => {
    assert.equal(
      paymentStatusForCharge(
        charge({ paid: true, status: "succeeded", refunded: false, amount_refunded: 0 }),
      ),
      "succeeded",
    );
  });

  it("prefers failed over refunded when both apply", () => {
    assert.equal(
      paymentStatusForCharge(charge({ paid: false, status: "failed", refunded: true })),
      "failed",
    );
  });
});

describe("buildChargeLinkIndex / linkForCharge", () => {
  const invoices = [
    {
      id: "in_sub",
      parent: { type: "subscription_details", subscription_details: { subscription: "sub_123" } },
      payments: { data: [{ payment: { payment_intent: "pi_sub", charge: null } }] },
    },
    {
      id: "in_oneoff",
      parent: { type: "invoice_details" },
      payments: { data: [{ payment: { payment_intent: null, charge: "ch_oneoff" } }] },
    },
  ] as unknown as Stripe.Invoice[];

  it("indexes by payment intent, falling back to charge id", () => {
    const index = buildChargeLinkIndex(invoices);
    assert.deepEqual(index.get("pi_sub"), { invoiceId: "in_sub", subscriptionId: "sub_123" });
    assert.deepEqual(index.get("ch_oneoff"), { invoiceId: "in_oneoff", subscriptionId: null });
  });

  it("finds a charge via its payment intent", () => {
    const index = buildChargeLinkIndex(invoices);
    const link = linkForCharge(charge({ id: "ch_x", payment_intent: "pi_sub" }), index);
    assert.equal(link?.subscriptionId, "sub_123");
  });

  it("finds a charge via its own id", () => {
    const index = buildChargeLinkIndex(invoices);
    const link = linkForCharge(charge({ id: "ch_oneoff", payment_intent: null }), index);
    assert.equal(link?.invoiceId, "in_oneoff");
  });

  it("returns null for an unlinked charge (a payment-link sale)", () => {
    const index = buildChargeLinkIndex(invoices);
    assert.equal(linkForCharge(charge({ id: "ch_none", payment_intent: null }), index), null);
  });

  it("accepts expanded objects as well as bare ids", () => {
    const index = buildChargeLinkIndex(invoices);
    const link = linkForCharge(
      charge({ id: "ch_y", payment_intent: { id: "pi_sub" } as Stripe.PaymentIntent }),
      index,
    );
    assert.equal(link?.subscriptionId, "sub_123");
  });
});

describe("paymentTypeForCharge", () => {
  it("classifies a subscription-linked charge as recurring", () => {
    assert.equal(paymentTypeForCharge({ invoiceId: "in_1", subscriptionId: "sub_1" }), "recurring");
  });

  it("classifies an invoice without a subscription as one-off", () => {
    assert.equal(paymentTypeForCharge({ invoiceId: "in_1", subscriptionId: null }), "one_time");
  });

  it("classifies an unlinked charge as one-off", () => {
    assert.equal(paymentTypeForCharge(null), "one_time");
  });
});

describe("resolveFeeCents", () => {
  it("reads the fee from an expanded balance transaction", () => {
    const c = charge({
      balance_transaction: { fee: 1289 } as Stripe.BalanceTransaction,
    });
    assert.equal(resolveFeeCents(c), 1289);
  });

  it("is zero when the balance transaction is an unexpanded id", () => {
    assert.equal(resolveFeeCents(charge({ balance_transaction: "txn_1" })), 0);
  });

  it("is zero when absent", () => {
    assert.equal(resolveFeeCents(charge({ balance_transaction: null })), 0);
  });
});
