import { companyIndustries } from "@/lib/company-industries";

export type WebsiteEnrichment = {
  requestedUrl: string;
  fetchedUrl: string;
  ok: boolean;
  error?: string;
  title: string | null;
  description: string | null;
  industryGuess: string | null;
  emails: string[];
  phones: string[];
  socials: Partial<Record<"instagram" | "linkedin" | "facebook" | "twitter", string>>;
  address: string | null;
};

const FETCH_TIMEOUT_MS = 9000;
const MAX_HTML_BYTES = 800_000;

function ensureProtocol(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `https://${url}`;
}

// Pull the `content` of the first <meta> tag whose name/property matches a key.
function metaContent(html: string, keys: string[]): string | null {
  const metaTags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of metaTags) {
    const key = tag.match(/(?:name|property)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    if (key && keys.includes(key)) {
      const content = tag.match(/content\s*=\s*["']([^"']*)["']/i)?.[1];
      if (content && content.trim()) {
        return decodeEntities(content.trim());
      }
    }
  }
  return null;
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string) {
  return decodeEntities(
    html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  );
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Skip emails that are really asset filenames, tracking noise, or template
// placeholders ("user@domain.com", "your@email.com", "name@example.com").
const EMAIL_BLOCKLIST =
  /(\.(png|jpg|jpeg|gif|svg|webp|css|js)$)|sentry|wixpress|example\.(com|org)|user@domain|your@?email|@yourdomain|@email\.com|name@|email@|@domain\.com|@sentry/i;
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
// Match "<number> <street/city words> <ST> <ZIP>", anchored on the trailing
// state + ZIP. Loose on commas so it catches both "St, City, ST ZIP" and Utah
// grid addresses ("2478 West 12600 South Riverton, UT 84065").
// A real US state token (abbreviation or full name) so grid street fragments
// like "West 12600" can't be mistaken for "STATE ZIP".
const US_STATE =
  "AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC" +
  "|Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|Ohio|Oklahoma|Oregon|Pennsylvania|Tennessee|Texas|Utah|Vermont|Virginia|Washington|Wisconsin|Wyoming|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Rhode Island|South Carolina|South Dakota|West Virginia";
// "<number> <street/city words>, <STATE> <ZIP>". Anchored on a known state so
// it handles Utah grid addresses ("2478 West 12600 South Riverton, Utah 84065").
const ADDRESS_RE = new RegExp(
  `(?<![\\d-])\\d{1,6}\\s+[\\w.'#,\\- ]{5,70}?\\b(?:${US_STATE})\\s+\\d{5}(?:-\\d{4})?`,
);

function uniq(values: string[], limit: number) {
  return [...new Set(values)].slice(0, limit);
}

function normalizePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) {
    return null;
  }
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  Healthcare: ["dental", "dentist", "medical", "clinic", "health", "wellness", "therapy", "chiropract", "care", "orthodont"],
  Automotive: ["auto", "car ", "vehicle", "tire", "mechanic", "dealership", "motor", "collision", "body shop"],
  Manufacturing: ["manufacturing plant", "factory", "fabrication", "machining", "production line", "assembly line"],
  Entertainment: ["yoga", "fitness", "gym", "studio", "pilates", "scuba", "dive", "recreation", "arcade", "theater", "music", "events"],
  Retail: ["shop", "store", "boutique", "retail", "apparel", "goods", "merchandise", "coffee", "cafe", "bakery", "gift"],
};

// Check specific industries before "Retail", which is the broad catch-all
// (almost every business homepage says "shop" or "store").
const INDUSTRY_PRIORITY = ["Healthcare", "Automotive", "Manufacturing", "Entertainment", "Retail"];

function guessIndustry(text: string): string | null {
  const haystack = text.toLowerCase();
  for (const industry of INDUSTRY_PRIORITY) {
    if (!companyIndustries.includes(industry as (typeof companyIndustries)[number])) {
      continue;
    }
    const keywords = INDUSTRY_KEYWORDS[industry] ?? [];
    if (keywords.some((kw) => haystack.includes(kw))) {
      return industry;
    }
  }
  return null;
}

function findSocials(html: string): WebsiteEnrichment["socials"] {
  const socials: WebsiteEnrichment["socials"] = {};
  const hrefs = [...html.matchAll(/href\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]);
  for (const href of hrefs) {
    if (!socials.instagram && /instagram\.com\/[a-z0-9._-]+/i.test(href)) socials.instagram = href;
    if (!socials.linkedin && /linkedin\.com\/(company|in)\/[a-z0-9._-]+/i.test(href)) socials.linkedin = href;
    if (!socials.facebook && /facebook\.com\/[a-z0-9._-]+/i.test(href)) socials.facebook = href;
    if (!socials.twitter && /(twitter|x)\.com\/[a-z0-9._]+/i.test(href)) socials.twitter = href;
  }
  return socials;
}

/**
 * Fetch a company's website and extract structured signals we can write back
 * into the CRM. Best-effort and resilient: any failure returns ok:false with a
 * reason rather than throwing, so callers can surface it without crashing.
 */
export async function scrapeCompanyWebsite(rawUrl: string): Promise<WebsiteEnrichment> {
  const requestedUrl = ensureProtocol(rawUrl.trim());
  const base: WebsiteEnrichment = {
    requestedUrl,
    fetchedUrl: requestedUrl,
    ok: false,
    title: null,
    description: null,
    industryGuess: null,
    emails: [],
    phones: [],
    socials: {},
    address: null,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(requestedUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "ToprockCRM-Enrichment/1.0 (+contact enrichment bot)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) {
      return { ...base, error: `HTTP ${res.status}` };
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("html")) {
      return { ...base, error: `Not HTML (${contentType || "unknown"})` };
    }

    const buf = await res.arrayBuffer();
    const html = new TextDecoder("utf-8").decode(buf.slice(0, MAX_HTML_BYTES));
    const text = stripTags(html);

    const title =
      html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ||
      metaContent(html, ["og:site_name", "og:title"]);
    const description = metaContent(html, ["description", "og:description"]);

    const rawEmails = (html.match(EMAIL_RE) ?? []).filter((e) => !EMAIL_BLOCKLIST.test(e));
    const emails = uniq(rawEmails.map((e) => e.toLowerCase()), 5);

    const rawPhones = (text.match(PHONE_RE) ?? []).map(normalizePhone).filter(Boolean) as string[];
    const phones = uniq(rawPhones, 5);

    const address = text.match(ADDRESS_RE)?.[0]?.replace(/\s+/g, " ").trim() ?? null;
    const industryGuess = guessIndustry(`${title ?? ""} ${description ?? ""} ${text.slice(0, 4000)}`);

    return {
      ...base,
      fetchedUrl: res.url || requestedUrl,
      ok: true,
      title: title ? decodeEntities(title) : null,
      description,
      industryGuess,
      emails,
      phones,
      socials: findSocials(html),
      address,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    return { ...base, error: controller.signal.aborted ? "Timed out" : message };
  } finally {
    clearTimeout(timeout);
  }
}
