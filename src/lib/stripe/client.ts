import Stripe from "stripe";

// Shared Stripe client. The key in the environment is expected to be a
// RESTRICTED, READ-ONLY key — see planning/003-stripe-payments/plan.html.
// The CRM only ever mirrors Stripe; it must not be able to move money.
let cachedStripe: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return null;
  }

  if (!cachedStripe) {
    cachedStripe = new Stripe(key);
  }

  return cachedStripe;
}
