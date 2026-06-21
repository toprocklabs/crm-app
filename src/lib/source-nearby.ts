// Server-side lead sourcing: given a customer's coordinates, ask OpenStreetMap
// (Overpass, free/no-key) what other businesses sit nearby. This is the in-app
// counterpart to scripts/source-nearby.mjs — the same query, callable from a
// server action so "Find more businesses nearby" works live on the map.
//
// Best-effort and resilient: any failure returns an empty list rather than
// throwing, so a flaky Overpass mirror never breaks the action.

export const SOURCING_RADIUS_M = 250;

export type RawCandidate = {
  name: string;
  category: string;
  address: string | null; // from OSM addr:* tags only; reverse-geocode happens in the caller
  lat: number;
  lng: number;
  distanceMeters: number;
};

// OSM amenity values that aren't real businesses to prospect.
const AMENITY_BLOCKLIST = new Set([
  "parking", "bench", "waste_basket", "toilets", "drinking_water", "fountain",
  "bicycle_parking", "recycling", "post_box", "vending_machine", "charging_station",
  "clock", "shelter", "bbq", "bicycle_repair_station", "atm",
]);

type OsmElement = { lat?: number; lon?: number; tags?: Record<string, string> };

function categoryOf(tags: Record<string, string>): string {
  return tags.shop || tags.office || tags.craft || tags.amenity || "business";
}

function addressFromTags(tags: Record<string, string>): string | null {
  const line = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const parts = [line, tags["addr:city"], tags["addr:state"], tags["addr:postcode"]].filter(Boolean);
  return parts.length >= 2 ? parts.join(", ") : null;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (d: number) => (d * Math.PI) / 180;
function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(aLat)) * Math.cos(toRad(bLat));
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

async function overpassNearby(lat: number, lng: number, radius: number): Promise<OsmElement[]> {
  const q =
    `[out:json][timeout:25];(` +
    `node(around:${radius},${lat},${lng})[name][shop];` +
    `node(around:${radius},${lat},${lng})[name][office];` +
    `node(around:${radius},${lat},${lng})[name][craft];` +
    `node(around:${radius},${lat},${lng})[name][amenity];` +
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
    const json = (await res.json()) as { elements?: OsmElement[] };
    return json.elements ?? [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Reverse-geocode a point to a human address (Nominatim, free/no-key). The
// caller throttles to respect the >= 1 req/sec policy.
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&zoom=18&lat=${lat}&lon=${lng}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "ToprockCRM-Geocode/1.0 (+contact enrichment bot)", Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { address?: Record<string, string> };
    const a = data.address ?? {};
    const line = [a.house_number, a.road].filter(Boolean).join(" ");
    const parts = [line, a.city || a.town || a.village, a.state, a.postcode].filter(Boolean);
    return parts.length >= 2 ? parts.join(", ") : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Find named businesses within `radiusMeters` of a point. Returns de-duplicated
 * (by name) raw candidates with distance and any OSM-tagged address. The caller
 * is responsible for de-duping against the CRM and reverse-geocoding the keepers.
 */
export async function sourceNearbyBusinesses(
  lat: number,
  lng: number,
  radiusMeters: number = SOURCING_RADIUS_M,
): Promise<RawCandidate[]> {
  const elements = await overpassNearby(lat, lng, radiusMeters);
  const seen = new Set<string>();
  const out: RawCandidate[] = [];

  for (const el of elements) {
    const name = el.tags?.name;
    if (!name || el.lat == null || el.lon == null) continue;
    const tags = el.tags ?? {};
    if (tags.amenity && !tags.shop && !tags.office && !tags.craft && AMENITY_BLOCKLIST.has(tags.amenity)) {
      continue;
    }
    const key = name.replace(/\s+/g, " ").trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      name,
      category: categoryOf(tags),
      address: addressFromTags(tags),
      lat: el.lat,
      lng: el.lon,
      distanceMeters: Math.round(haversineMeters(lat, lng, el.lat, el.lon)),
    });
  }

  return out;
}
