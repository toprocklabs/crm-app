import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Lead sourcing: for each won CUSTOMER that has coordinates, ask OpenStreetMap
// (free, no key) what other businesses sit nearby, and drop the ones not yet in
// the CRM into the `suggestions` queue as new_company proposals. The /inbox page
// lets a human promote a suggestion into a new_lead account (wired to the
// customer it was found near via a colocated_with edge). This is the
// "find more related customers" loop: a proven customer plaza -> its neighbors.

const RADIUS_M = 250;

// OSM amenity values that aren't real businesses to prospect.
const AMENITY_BLOCKLIST = new Set([
  "parking", "bench", "waste_basket", "toilets", "drinking_water", "fountain",
  "bicycle_parking", "recycling", "post_box", "vending_machine", "charging_station",
  "clock", "shelter", "bbq", "bicycle_repair_station", "atm",
]);

function categoryOf(tags) {
  return tags.shop || tags.office || tags.craft || tags.amenity || "business";
}

// An address so the reviewer can eyeball that the lead really is nearby. Prefer
// the node's own OSM addr:* tags; fall back to reverse-geocoding its coords.
function addressFromTags(tags) {
  const line = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [line, tags["addr:city"], tags["addr:state"], tags["addr:postcode"]].filter(Boolean);
  return parts.length >= 2 ? parts.join(", ") : null;
}

async function reverseGeocode(lat, lng) {
  if (lat == null || lng == null) return null;
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ToprockCRM-Geocode/1.0 (+contact enrichment bot)", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const a = (await res.json())?.address ?? {};
    const line = [a.house_number, a.road].filter(Boolean).join(" ");
    const parts = [line, a.city || a.town || a.village, a.state, a.postcode].filter(Boolean);
    return parts.length >= 2 ? parts.join(", ") : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function overpassNearby(lat, lng) {
  const q =
    `[out:json][timeout:25];(` +
    `node(around:${RADIUS_M},${lat},${lng})[name][shop];` +
    `node(around:${RADIUS_M},${lat},${lng})[name][office];` +
    `node(around:${RADIUS_M},${lat},${lng})[name][craft];` +
    `node(around:${RADIUS_M},${lat},${lng})[name][amenity];` +
    `);out body 80;`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "ToprockCRM-Sourcing/1.0" },
      body: "data=" + encodeURIComponent(q),
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.elements ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (d) => (d * Math.PI) / 180;
function haversineMeters(aLat, aLng, bLat, bLng) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(aLat)) * Math.cos(toRad(bLat));
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => s.replace(/\s+/g, " ").trim().toLowerCase();

// Anchors = won customers that have been geocoded.
const anchors = await sql`
  select id, name, lat, lng
  from companies
  where stage = 'customer' and lat is not null and lng is not null
  order by id
`;

if (!anchors.length) {
  console.log("No geocoded customers to source around. Run npm run enrich:real first.");
  process.exit(0);
}

// Names already in the CRM, and businesses already proposed (pending/approved),
// so we never suggest a duplicate.
const existingCompanies = await sql`select name from companies`;
const existingNames = new Set(existingCompanies.map((c) => norm(c.name)));
const queued = await sql`select payload->>'name' as name from suggestions where kind = 'new_company' and status in ('pending','approved')`;
const queuedNames = new Set(queued.filter((q) => q.name).map((q) => norm(q.name)));

console.log(`Sourcing around ${anchors.length} customer(s) within ${RADIUS_M}m.\n`);

const seenThisRun = new Set();
let inserted = 0;

for (const anchor of anchors) {
  console.log(`=== Near #${anchor.id} ${anchor.name} ===`);
  const elements = await overpassNearby(anchor.lat, anchor.lng);

  for (const el of elements) {
    const name = el.tags?.name;
    if (!name) continue;
    const category = categoryOf(el.tags);
    if (el.tags.amenity && !el.tags.shop && !el.tags.office && !el.tags.craft && AMENITY_BLOCKLIST.has(el.tags.amenity)) {
      continue;
    }
    const key = norm(name);
    if (existingNames.has(key) || queuedNames.has(key) || seenThisRun.has(key)) continue;
    seenThisRun.add(key);

    const lat = el.lat ?? null;
    const lng = el.lon ?? null;
    const distance = lat != null && lng != null ? haversineMeters(anchor.lat, anchor.lng, lat, lng) : null;
    const confidence = distance != null ? Math.max(0, Math.min(100, Math.round(100 - (distance / RADIUS_M) * 40))) : 60;

    let address = addressFromTags(el.tags);
    if (!address) {
      address = await reverseGeocode(lat, lng);
      await sleep(1200); // Nominatim reverse: stay under 1 req/sec
    }

    const evidence = `Found via OpenStreetMap ${distance != null ? `~${distance.toFixed(0)}m` : "nearby"} from ${anchor.name} (customer)`;
    const title = `${name} — ${category} near ${anchor.name}`;
    const payload = {
      name,
      category,
      address,
      lat,
      lng,
      nearCompanyId: anchor.id,
      nearCompanyName: anchor.name,
      distanceMeters: distance != null ? Math.round(distance) : null,
    };

    await sql`
      insert into suggestions (kind, title, payload, confidence, evidence, source, status)
      values ('new_company', ${title}, ${JSON.stringify(payload)}::jsonb, ${confidence}, ${evidence}, 'agent'::data_source, 'pending'::suggestion_status)
    `;
    inserted++;
    console.log(`  + ${name} [${category}] ${distance != null ? distance.toFixed(0) + "m" : ""} ${address ? "— " + address : ""} (conf ${confidence})`);
  }

  await sleep(1200); // be polite to the Overpass API
  console.log("");
}

console.log(`Done. ${inserted} new suggestion(s) queued.`);
if (inserted > 0) {
  console.log("Review them at /inbox and promote the good ones to leads.");
}
