import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Real Riverton, UT businesses standing in for the fictional demo leads.
const TARGETS = [
  { name: "Scuba Riverton", website: "https://scubadiveriverton.com" },
  { name: "Riverton Yoga", website: "https://reflection.yoga" },
  { name: "Riverton Coffee Co", website: "https://www.thecoffeeshoput.com" },
];

// --- Extraction (mirrors src/lib/enrich.ts; the in-app button uses that TS version) ---
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_BLOCKLIST =
  /(\.(png|jpg|jpeg|gif|svg|webp|css|js)$)|sentry|wixpress|example\.(com|org)|user@domain|your@?email|@yourdomain|@email\.com|name@|email@|@domain\.com/i;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const US_STATE =
  "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC" +
  "|Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|Ohio|Oklahoma|Oregon|Pennsylvania|Tennessee|Texas|Utah|Vermont|Virginia|Washington|Wisconsin|Wyoming|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Rhode Island|South Carolina|South Dakota|West Virginia";
const ADDRESS_RE = new RegExp(
  `(?<![\\d-])\\d{1,6}\\s+[\\w.'#,\\- ]{5,70}?\\b(?:${US_STATE})\\s+\\d{5}(?:-\\d{4})?`,
);
const INDUSTRY_KEYWORDS = {
  Healthcare: ["dental", "dentist", "medical", "clinic", "health", "wellness", "therapy", "chiropract", "care"],
  Automotive: ["auto", "car ", "vehicle", "tire", "mechanic", "dealership", "motor", "collision"],
  Manufacturing: ["manufacturing plant", "factory", "fabrication", "machining", "production line", "assembly line"],
  Entertainment: ["yoga", "fitness", "gym", "studio", "pilates", "scuba", "dive", "recreation", "theater", "music"],
  Retail: ["shop", "store", "boutique", "retail", "apparel", "coffee", "cafe", "bakery", "gift"],
};
// Specific industries before "Retail" (the broad catch-all).
const INDUSTRIES = ["Healthcare", "Automotive", "Manufacturing", "Entertainment", "Retail"];

function decode(t) {
  return t
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim();
}
function strip(html) {
  return decode(
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}
function meta(html, keys) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (key && keys.includes(key)) {
      const c = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
      if (c && c.trim()) return decode(c.trim());
    }
  }
  return null;
}
function normPhone(raw) {
  const d = raw.replace(/\D/g, "");
  const ten = d.length === 11 && d.startsWith("1") ? d.slice(1) : d;
  return ten.length === 10 ? `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}` : null;
}
function guessIndustry(text) {
  const h = text.toLowerCase();
  for (const ind of INDUSTRIES) {
    if ((INDUSTRY_KEYWORDS[ind] ?? []).some((kw) => h.includes(kw))) return ind;
  }
  return null;
}
function socials(html) {
  const out = {};
  for (const m of html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)) {
    const href = m[1];
    if (!out.instagram && /instagram\.com\/[a-z0-9._-]+/i.test(href)) out.instagram = href;
    if (!out.facebook && /facebook\.com\/[a-z0-9._-]+/i.test(href)) out.facebook = href;
    if (!out.linkedin && /linkedin\.com\/(company|in)\/[a-z0-9._-]+/i.test(href)) out.linkedin = href;
  }
  return out;
}

async function scrape(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ToprockCRM-Enrichment/1.0", Accept: "text/html" },
    });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
    const html = (await res.text()).slice(0, 800_000);
    const text = strip(html);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || meta(html, ["og:site_name"]);
    const description = meta(html, ["description", "og:description"]);
    const emails = [...new Set((html.match(EMAIL_RE) ?? []).filter((e) => !EMAIL_BLOCKLIST.test(e)).map((e) => e.toLowerCase()))].slice(0, 5);
    const phones = [...new Set((text.match(PHONE_RE) ?? []).map(normPhone).filter(Boolean))].slice(0, 5);
    const address = text.match(ADDRESS_RE)?.[0]?.replace(/\s+/g, " ").trim() ?? null;
    return {
      ok: true,
      fetchedUrl: res.url || url,
      title: title ? decode(title) : null,
      description,
      industryGuess: guessIndustry(`${title ?? ""} ${description ?? ""} ${text.slice(0, 4000)}`),
      emails,
      phones,
      address,
      socials: socials(html),
    };
  } catch (err) {
    return { ok: false, error: controller.signal.aborted ? "Timed out" : String(err) };
  } finally {
    clearTimeout(timer);
  }
}

for (const target of TARGETS) {
  const rows = await sql`select id, address, industry from companies where name = ${target.name} limit 1`;
  if (!rows.length) {
    console.log(`\n${target.name}: not found in DB, skipping.`);
    continue;
  }
  const company = rows[0];
  // Reset so the demo is cleanly re-runnable: clear prior auto-filled fields
  // and remove earlier agent enrichment notes for these demo accounts only.
  await sql`update companies set website = ${target.website}, address = null, industry = null where id = ${company.id}`;
  await sql`delete from activities where company_id = ${company.id} and source = 'agent'::data_source and notes like 'Website enrichment%'`;
  company.address = null;
  company.industry = null;

  const r = await scrape(target.website);
  console.log(`\n=== ${target.name}  (${target.website}) ===`);
  if (!r.ok) {
    console.log(`  scrape failed: ${r.error}`);
    continue;
  }
  console.log(`  title:    ${r.title ?? "-"}`);
  console.log(`  about:    ${(r.description ?? "-").slice(0, 120)}`);
  console.log(`  industry: ${r.industryGuess ?? "-"}`);
  console.log(`  address:  ${r.address ?? "-"}`);
  console.log(`  emails:   ${r.emails.join(", ") || "-"}`);
  console.log(`  phones:   ${r.phones.join(", ") || "-"}`);
  console.log(`  socials:  ${Object.values(r.socials).join(", ") || "-"}`);

  const updates = [];
  if (!company.address && r.address) updates.push(sql`address = ${r.address}`);
  if (!company.industry && r.industryGuess) updates.push(sql`industry = ${r.industryGuess}`);
  if (!company.address && r.address) {
    await sql`update companies set address = ${r.address} where id = ${company.id}`;
  }
  if (!company.industry && r.industryGuess) {
    await sql`update companies set industry = ${r.industryGuess} where id = ${company.id}`;
  }

  const lines = [`Website enrichment from ${r.fetchedUrl}`];
  if (r.description) lines.push(`About: ${r.description}`);
  if (r.industryGuess) lines.push(`Industry guess: ${r.industryGuess}`);
  if (r.address) lines.push(`Address: ${r.address}`);
  if (r.emails.length) lines.push(`Emails: ${r.emails.join(", ")}`);
  if (r.phones.length) lines.push(`Phones: ${r.phones.join(", ")}`);
  const soc = Object.values(r.socials).filter(Boolean);
  if (soc.length) lines.push(`Social: ${soc.join(", ")}`);

  await sql`
    insert into activities (type, notes, company_id, source)
    values ('note', ${lines.join("\n")}, ${company.id}, 'agent'::data_source)
  `;
}

console.log("\nDone. Open /accounts/14 (Riverton Yoga) — enrichment is logged in the timeline and fields are filled.");
