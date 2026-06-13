import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Batch enrichment for REAL accounts: scrape each company's website for an
// address + industry, then geocode the address to coordinates so the proximity
// graph has real data. Idempotent and non-destructive — only fills empty fields
// and only geocodes companies that lack coordinates. Mirrors the in-app
// "Enrich from website" action (src/app/actions.ts + src/lib/enrich.ts +
// src/lib/geocode.ts) so the script and the button stay in lockstep.

// --- Website extraction (mirrors src/lib/enrich.ts) ---
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
  Healthcare: ["dental", "dentist", "medical", "clinic", "health", "wellness", "therapy", "chiropract", "care", "orthodont", "massage", "spa"],
  Automotive: ["auto", "car ", "vehicle", "tire", "mechanic", "dealership", "motor", "collision", "body shop", "emissions"],
  Manufacturing: ["manufacturing plant", "factory", "fabrication", "machining", "production line", "assembly line", "coating"],
  Entertainment: ["yoga", "fitness", "gym", "studio", "pilates", "scuba", "dive", "recreation", "arcade", "theater", "music", "events", "party", "parties"],
  Retail: ["shop", "store", "boutique", "retail", "apparel", "goods", "merchandise", "coffee", "cafe", "bakery", "gift", "cabinets"],
};
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

// --- Geocoding (mirrors src/lib/geocode.ts: Census first, Nominatim fallback) ---
async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "ToprockCRM-Geocode/1.0 (+contact enrichment bot)", Accept: "application/json", ...headers },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
const finite = (v) => typeof v === "number" && Number.isFinite(v);
async function geocodeCensus(address) {
  const u =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
    `?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const m = (await fetchJson(u))?.result?.addressMatches?.[0];
  const lat = m?.coordinates?.y, lng = m?.coordinates?.x;
  if (!finite(lat) || !finite(lng)) return null;
  return { lat, lng, formattedAddress: m?.matchedAddress ?? null, provider: "census" };
}
async function geocodeNominatim(address) {
  const u = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
  const hit = (await fetchJson(u))?.[0];
  const lat = hit ? Number(hit.lat) : NaN, lng = hit ? Number(hit.lon) : NaN;
  if (!finite(lat) || !finite(lng)) return null;
  return { lat, lng, formattedAddress: hit?.display_name ?? null, provider: "nominatim" };
}
async function geocode(address) {
  if (!address || address.trim().length < 5) return null;
  return (await geocodeCensus(address.trim())) ?? (await geocodeNominatim(address.trim()));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- Run over every real account with a website ---
const companies = await sql`
  select id, name, website, address, industry, lat, lng
  from companies
  where website is not null and website <> ''
  order by id
`;

console.log(`Enriching ${companies.length} account(s) with a website.\n`);
let geocoded = 0, addressed = 0, industried = 0;

for (const c of companies) {
  console.log(`=== #${c.id} ${c.name} (${c.website}) ===`);
  const r = await scrape(c.website);
  if (!r.ok) {
    console.log(`  scrape failed: ${r.error}\n`);
    continue;
  }

  const logLines = [`Website enrichment from ${r.fetchedUrl}`];
  let wroteSomething = false;

  if (!c.address && r.address) {
    await sql`update companies set address = ${r.address} where id = ${c.id}`;
    c.address = r.address;
    addressed++;
    wroteSomething = true;
    logLines.push(`Address: ${r.address}`);
    console.log(`  address:  ${r.address}`);
  } else if (c.address) {
    console.log(`  address:  (kept) ${c.address}`);
  } else {
    console.log(`  address:  - (none found)`);
  }

  if (!c.industry && r.industryGuess) {
    await sql`update companies set industry = ${r.industryGuess} where id = ${c.id}`;
    c.industry = r.industryGuess;
    industried++;
    wroteSomething = true;
    logLines.push(`Industry guess: ${r.industryGuess}`);
    console.log(`  industry: ${r.industryGuess}`);
  }

  // Geocode when we have an address but no coordinates yet.
  if (c.address && c.lat == null && c.lng == null) {
    const g = await geocode(c.address);
    if (g) {
      await sql`update companies set lat = ${g.lat}, lng = ${g.lng} where id = ${c.id}`;
      await sql`
        insert into place_enrichment (company_id, formatted_address, lat, lng, provider)
        values (${c.id}, ${g.formattedAddress}, ${g.lat}, ${g.lng}, ${g.provider})
        on conflict (company_id) do update
          set formatted_address = excluded.formatted_address,
              lat = excluded.lat,
              lng = excluded.lng,
              provider = excluded.provider,
              geocoded_at = now()
      `;
      geocoded++;
      wroteSomething = true;
      logLines.push(`Geocoded (${g.provider}): ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)}`);
      console.log(`  geocode:  ${g.lat.toFixed(5)}, ${g.lng.toFixed(5)} (${g.provider})`);
      await sleep(1100); // be polite to the geocoding providers
    } else {
      console.log(`  geocode:  - (no match for "${c.address}")`);
    }
  } else if (c.lat != null) {
    console.log(`  geocode:  (kept) ${c.lat}, ${c.lng}`);
  }

  if (r.emails.length) logLines.push(`Emails: ${r.emails.join(", ")}`);
  if (r.phones.length) logLines.push(`Phones: ${r.phones.join(", ")}`);
  const soc = Object.values(r.socials).filter(Boolean);
  if (soc.length) logLines.push(`Social: ${soc.join(", ")}`);

  // Only log an auditable activity when we actually wrote new structured data,
  // so re-runs don't spam the timeline.
  if (wroteSomething) {
    await sql`
      insert into activities (type, notes, company_id, source)
      values ('note', ${logLines.join("\n")}, ${c.id}, 'agent'::data_source)
    `;
  }
  console.log("");
}

console.log("Done.");
console.log(`  addresses filled: ${addressed}`);
console.log(`  industries filled: ${industried}`);
console.log(`  geocoded: ${geocoded}`);
