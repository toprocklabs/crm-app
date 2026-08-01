// Pure reconciliation logic for plan 003. Two payment types, two different
// questions — see planning/003-stripe-payments/plan.html "The two
// reconciliations". Kept free of DB/UI so the rules are testable in isolation.

export type RecurringState =
  | "no_plan" // nothing sold, nothing billing — correct, not a problem
  | "matched"
  | "not_billing" // sold but no active subscription at all
  | "shortfall" // billing less than sold
  | "over"; // billing more than the CRM records

export type RecurringVerdict = {
  state: RecurringState;
  expectedCents: number;
  actualCents: number;
  deltaCents: number; // actual - expected
  label: string;
  tone: string;
};

export function reconcileRecurring(expectedCents: number, actualCents: number): RecurringVerdict {
  const expected = Math.max(0, expectedCents ?? 0);
  const actual = Math.max(0, actualCents ?? 0);
  const delta = actual - expected;

  const base = { expectedCents: expected, actualCents: actual, deltaCents: delta };

  // Two of seven clients bought a build with no maintenance plan. Zero
  // expected MRR is the correct answer for them, never a missing subscription.
  if (expected === 0 && actual === 0) {
    return { ...base, state: "no_plan", label: "No maintenance plan", tone: "bg-slate-100 text-slate-600" };
  }
  if (expected > 0 && actual === 0) {
    return { ...base, state: "not_billing", label: "Sold but not billing", tone: "bg-red-100 text-red-800" };
  }
  if (delta === 0) {
    return { ...base, state: "matched", label: "Billing matches", tone: "bg-emerald-100 text-emerald-800" };
  }
  if (delta < 0) {
    return { ...base, state: "shortfall", label: "Under-billing", tone: "bg-red-100 text-red-800" };
  }
  return { ...base, state: "over", label: "Billing above recorded", tone: "bg-amber-100 text-amber-800" };
}

export type OneOffState = "none" | "complete" | "partial" | "unpaid" | "over";

export type OneOffVerdict = {
  state: OneOffState;
  contractedCents: number;
  collectedCents: number;
  remainingCents: number;
  percent: number; // 0-100, clamped for display
  label: string;
  tone: string;
};

/**
 * One-off build fees bill as a deposit plus later phases (5 of our 7 SOWs), so
 * this is deliberately a progress figure, not an equality check. A partial
 * balance mid-project is normal.
 */
export function reconcileOneOff(contractedCents: number, collectedCents: number): OneOffVerdict {
  const contracted = Math.max(0, contractedCents ?? 0);
  const collected = Math.max(0, collectedCents ?? 0);
  const remaining = contracted - collected;
  const percent = contracted > 0 ? Math.min(100, Math.round((collected / contracted) * 100)) : collected > 0 ? 100 : 0;

  const base = {
    contractedCents: contracted,
    collectedCents: collected,
    remainingCents: remaining,
    percent,
  };

  if (contracted === 0 && collected === 0) {
    return { ...base, state: "none", label: "No build fee", tone: "bg-slate-100 text-slate-600" };
  }
  if (contracted === 0 && collected > 0) {
    return { ...base, state: "over", label: "Collected, none contracted", tone: "bg-amber-100 text-amber-800" };
  }
  if (remaining <= 0) {
    return { ...base, state: "complete", label: "Paid in full", tone: "bg-emerald-100 text-emerald-800" };
  }
  if (collected === 0) {
    return { ...base, state: "unpaid", label: "Nothing collected", tone: "bg-red-100 text-red-800" };
  }
  return { ...base, state: "partial", label: "Partially collected", tone: "bg-sky-100 text-sky-800" };
}
