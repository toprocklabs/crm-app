// Backfill: mirror Stripe charges and subscriptions into the CRM and link
// them to accounts. Read-only against Stripe. Idempotent — upserts by Stripe
// id, so re-running corrects drift instead of duplicating rows.
//
// Usage:
//   npm run stripe:import -- [--dry-run] [--since 2026-01-01] [--include-test]
//
// See planning/003-stripe-payments/plan.html.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import Stripe from "stripe";
import {
  buildChargeLinkIndex,
  chargeToPaymentRow,
  linkForCharge,
  subscriptionInterval,
  subscriptionMonthlyCents,
} from "../src/lib/stripe/normalize";

config({ path: ".env.local" });
config();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const includeTest = args.includes("--include-test");
const sinceArg = args.includes("--since") ? args[args.indexOf("--since") + 1] : null;
const since = sinceArg ? Math.floor(new Date(sinceArg).getTime() / 1000) : undefined;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}
if (!process.env.STRIPE_SECRET_KEY) {
  console.error(
    "STRIPE_SECRET_KEY is missing. Create a RESTRICTED, READ-ONLY key in the\n" +
      "Stripe dashboard (Developers -> API keys -> Create restricted key) with read\n" +
      "access to Charges, Customers, Subscriptions, Invoices, and Balance transactions,\n" +
      "then add it to .env.local.",
  );
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ── 1. Customers ────────────────────────────────────────────────────────────
console.log(`Fetching Stripe customers…${dryRun ? " (dry run)" : ""}`);
const customers: Stripe.Customer[] = [];
for await (const customer of stripe.customers.list({ limit: 100 })) {
  customers.push(customer);
}
console.log(`  ${customers.length} customers`);

// ── 2. Link customers to CRM accounts ───────────────────────────────────────
// Exact email match auto-links; a name match is only proposed, because company
// names collide. Anything else stays unlinked and visible rather than guessed.
const customerToCompany = new Map<string, number>();
const linkReport: string[] = [];

for (const customer of customers) {
  const email = customer.email?.trim().toLowerCase();
  const name = customer.name?.trim();
  let companyId: number | null = null;
  let how = "";

  if (email) {
    const rows = await sql`
      select c.company_id, co.name
      from contacts c join companies co on co.id = c.company_id
      where lower(c.email) = ${email} and c.company_id is not null
    `;
    if (rows.length === 1) {
      companyId = rows[0].company_id as number;
      how = `email ${email} -> "${rows[0].name}"`;
    } else if (rows.length > 1) {
      how = `AMBIGUOUS: email ${email} matches ${rows.length} accounts — left unlinked`;
    }
  }

  if (!companyId && name) {
    const rows = await sql`select id, name from companies where lower(name) = lower(${name})`;
    if (rows.length === 1) {
      how = `PROPOSED: name "${name}" -> account #${rows[0].id} (confirm in-app)`;
    }
  }

  if (companyId) {
    customerToCompany.set(customer.id, companyId);
    if (!dryRun) {
      await sql`update companies set stripe_customer_id = ${customer.id} where id = ${companyId}`;
    }
  }

  linkReport.push(
    `  ${customer.id}  ${(name ?? email ?? "(unnamed)").padEnd(28)} ${how || "no match — unlinked"}`,
  );
}
console.log("Linking:");
linkReport.forEach((line) => console.log(line));

// ── 3. Subscriptions (real MRR) ─────────────────────────────────────────────
console.log("Fetching subscriptions…");
let subCount = 0;
let mrrTotal = 0;
for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
  if (!sub.livemode && !includeTest) continue;

  const monthly = subscriptionMonthlyCents(sub);
  const companyId = customerToCompany.get(String(sub.customer)) ?? null;
  if (sub.status === "active" || sub.status === "trialing") mrrTotal += monthly;
  subCount++;

  if (dryRun) {
    console.log(`  ${sub.id} ${sub.status.padEnd(10)} ${money(monthly)}/mo -> account ${companyId ?? "UNLINKED"}`);
    continue;
  }

  await sql`
    insert into stripe_subscriptions (
      stripe_subscription_id, company_id, stripe_customer_id, status,
      monthly_amount_cents, interval, current_period_end, canceled_at, livemode, synced_at
    ) values (
      ${sub.id}, ${companyId}, ${String(sub.customer)}, ${sub.status},
      ${monthly}, ${subscriptionInterval(sub)},
      ${sub.items.data[0]?.current_period_end ? new Date(sub.items.data[0].current_period_end * 1000) : null},
      ${sub.canceled_at ? new Date(sub.canceled_at * 1000) : null}, ${sub.livemode}, now()
    )
    on conflict (stripe_subscription_id) do update set
      company_id = coalesce(excluded.company_id, stripe_subscriptions.company_id),
      status = excluded.status,
      monthly_amount_cents = excluded.monthly_amount_cents,
      interval = excluded.interval,
      current_period_end = excluded.current_period_end,
      canceled_at = excluded.canceled_at,
      synced_at = now()
  `;
}
console.log(`  ${subCount} subscriptions · active MRR ${money(mrrTotal)}`);

// ── 4. Invoices → charge link index (classifies one_time vs recurring) ──────
console.log("Fetching invoices…");
const invoices: Stripe.Invoice[] = [];
for await (const invoice of stripe.invoices.list({ limit: 100, expand: ["data.payments"] })) {
  invoices.push(invoice);
}
const linkIndex = buildChargeLinkIndex(invoices);
console.log(`  ${invoices.length} invoices · ${linkIndex.size} charge links`);

// ── 5. Charges (the money ledger) ───────────────────────────────────────────
console.log("Fetching charges…");
let paid = 0;
let oneTimeTotal = 0;
let recurringTotal = 0;
let unlinked = 0;

for await (const charge of stripe.charges.list({
  limit: 100,
  ...(since ? { created: { gte: since } } : {}),
  expand: ["data.balance_transaction"],
})) {
  if (!charge.livemode && !includeTest) continue;

  const row = chargeToPaymentRow(charge, linkForCharge(charge, linkIndex));
  if (row.status === "failed") continue;

  const companyId = row.stripeCustomerId
    ? (customerToCompany.get(row.stripeCustomerId) ?? null)
    : null;
  if (!companyId) unlinked++;

  const net = row.amountCents - row.refundedCents;
  if (row.type === "recurring") recurringTotal += net;
  else oneTimeTotal += net;
  paid++;

  if (dryRun) {
    console.log(
      `  ${row.paidAt.toISOString().slice(0, 10)} ${money(row.amountCents).padStart(9)} ` +
        `${row.type.padEnd(9)} ${(row.description ?? "").slice(0, 34).padEnd(34)} ` +
        `-> account ${companyId ?? "UNLINKED"}`,
    );
    continue;
  }

  await sql`
    insert into payments (
      stripe_charge_id, company_id, stripe_customer_id, amount_cents, fee_cents,
      refunded_cents, currency, status, type, description, receipt_url,
      stripe_invoice_id, stripe_subscription_id, livemode, paid_at, synced_at
    ) values (
      ${row.stripeChargeId}, ${companyId}, ${row.stripeCustomerId}, ${row.amountCents},
      ${row.feeCents}, ${row.refundedCents}, ${row.currency}, ${row.status}, ${row.type},
      ${row.description}, ${row.receiptUrl}, ${row.stripeInvoiceId},
      ${row.stripeSubscriptionId}, ${row.livemode}, ${row.paidAt}, now()
    )
    on conflict (stripe_charge_id) do update set
      company_id = coalesce(excluded.company_id, payments.company_id),
      amount_cents = excluded.amount_cents,
      fee_cents = excluded.fee_cents,
      refunded_cents = excluded.refunded_cents,
      status = excluded.status,
      type = excluded.type,
      stripe_invoice_id = excluded.stripe_invoice_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      synced_at = now()
  `;
}

console.log(`
─────────────────────────────────────────────
  Payments synced   ${paid}
  One-off collected ${money(oneTimeTotal)}
  Recurring collected ${money(recurringTotal)}
  Total collected   ${money(oneTimeTotal + recurringTotal)}
  Active MRR        ${money(mrrTotal)}
  Unattributed      ${unlinked} payment(s) — link the account to attribute
─────────────────────────────────────────────
${dryRun ? "Dry run — nothing written." : "Done."}`);
