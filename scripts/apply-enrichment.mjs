import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

// Apply a Claude-Code-researched enrichment to a company. The *research* is done
// here in Claude Code (web search/fetch) — this script is just the writer, so the
// enrichment loop needs no Anthropic API key. Repeatable: re-running only fills
// empty company fields and de-dupes contacts, so it's safe to run again.
//
// Usage:  node scripts/apply-enrichment.mjs <companyId> <path-to-enrichment.json>
//
// enrichment.json shape (all fields optional):
// {
//   "website": "https://...",
//   "phone": "(801) 555-1234",
//   "emails": ["owner@biz.com"],
//   "industry": "Retail",                      // only applied if a valid CRM industry
//   "contacts": [{ "name": "Jane Doe", "title": "Owner", "email": "...", "phone": "..." }],
//   "socials": { "instagram": "...", "facebook": "...", "linkedin": "..." },
//   "bookingUrl": "https://...",
//   "hours": "Mon-Sat 9-7",
//   "summary": "One-line description.",
//   "sources": ["https://...", "yelp"],
//   "confidenceNote": "Owner name inferred from listing — verify."
// }

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const [companyIdArg, jsonPath] = process.argv.slice(2);
if (!companyIdArg || !jsonPath) {
  console.error("Usage: node scripts/apply-enrichment.mjs <companyId> <path-to-enrichment.json>");
  process.exit(1);
}
const companyId = Number(companyIdArg);
if (!Number.isInteger(companyId) || companyId <= 0) {
  console.error(`Invalid companyId: ${companyIdArg}`);
  process.exit(1);
}

const VALID_INDUSTRIES = ["Retail", "Automotive", "Entertainment", "Healthcare", "Manufacturing"];

const sql = neon(process.env.DATABASE_URL);

const data = JSON.parse(readFileSync(jsonPath, "utf8"));

function normalizeUrl(v) {
  if (!v) return null;
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}
function splitName(full) {
  const parts = String(full).trim().split(/\s+/);
  if (parts.length <= 1) return { first: parts[0] ?? "", last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

const company = (await sql`select id, name, website, industry from companies where id = ${companyId}`)[0];
if (!company) {
  console.error(`Company #${companyId} not found.`);
  process.exit(1);
}

const run = (await sql`
  insert into agent_runs (loop, model, status, notes)
  values ('enrich', 'claude-code', 'running', ${`Research ${company.name}`})
  returning id
`)[0];

// --- Fill empty company fields (never clobber human-entered data) ---
if (!company.website && data.website) {
  await sql`update companies set website = ${normalizeUrl(data.website)} where id = ${companyId}`;
  console.log(`  website: ${normalizeUrl(data.website)}`);
}
if (!company.industry && data.industry && VALID_INDUSTRIES.includes(data.industry)) {
  await sql`update companies set industry = ${data.industry} where id = ${companyId}`;
  console.log(`  industry: ${data.industry}`);
}

// --- Contacts (cap 5) ---
let contactsAdded = 0;
for (const c of (data.contacts ?? []).slice(0, 5)) {
  if (!c.name && !c.email) continue;
  const { first, last } = splitName(c.name ?? c.email.split("@")[0]);
  if (c.email) {
    await sql`
      insert into contacts (first_name, last_name, email, phone, title, company_id)
      values (${first}, ${last}, ${c.email}, ${c.phone ?? null}, ${c.title ?? null}, ${companyId})
      on conflict (email) do update
        set first_name = excluded.first_name, last_name = excluded.last_name,
            phone = excluded.phone, title = excluded.title, company_id = excluded.company_id
    `;
    contactsAdded++;
    console.log(`  contact: ${first} ${last} <${c.email}>`);
  } else {
    const existing = await sql`select id from contacts where company_id = ${companyId} and first_name = ${first} and last_name = ${last} limit 1`;
    if (!existing.length) {
      await sql`insert into contacts (first_name, last_name, phone, title, company_id) values (${first}, ${last}, ${c.phone ?? null}, ${c.title ?? null}, ${companyId})`;
      contactsAdded++;
      console.log(`  contact: ${first} ${last}`);
    }
  }
}

// --- Auditable enrichment note ---
const lines = ["Online enrichment (Claude Code web research)"];
if (data.summary) lines.push(data.summary);
if (data.website) lines.push(`Website: ${data.website}`);
if (data.phone) lines.push(`Phone: ${data.phone}`);
if (data.emails?.length) lines.push(`Emails: ${data.emails.join(", ")}`);
for (const c of data.contacts ?? []) {
  const bits = [c.name, c.title, c.email, c.phone].filter(Boolean).join(" · ");
  if (bits) lines.push(`Contact: ${bits}`);
}
const socials = Object.values(data.socials ?? {}).filter(Boolean);
if (socials.length) lines.push(`Social: ${socials.join(", ")}`);
if (data.bookingUrl) lines.push(`Booking: ${data.bookingUrl}`);
if (data.hours) lines.push(`Hours: ${data.hours}`);
if (data.confidenceNote) lines.push(`Note: ${data.confidenceNote}`);
if (data.sources?.length) lines.push(`Sources: ${data.sources.slice(0, 8).join(", ")}`);

await sql`insert into activities (type, notes, company_id, source) values ('note', ${lines.join("\n")}, ${companyId}, 'agent'::data_source)`;

await sql`update agent_runs set status = 'ok', items_proposed = ${contactsAdded}, finished_at = now() where id = ${run.id}`;

console.log(`\nEnriched ${company.name} (#${companyId}) — ${contactsAdded} contact(s). Logged to timeline + agent_runs #${run.id}.`);
