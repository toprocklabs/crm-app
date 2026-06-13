// Address -> coordinates. Powers the proximity ("plaza neighbors") play in
// src/lib/graph.ts. Best-effort and provider-pluggable: try free, no-key
// providers first (US Census for US addresses, then Nominatim/OSM), and use
// Google only when an API key is configured. Any failure returns null rather
// than throwing, so callers can geocode opportunistically without crashing.

export type GeocodeProvider = "google" | "census" | "nominatim";

export type GeocodeResult = {
  lat: number;
  lng: number;
  formattedAddress: string | null;
  provider: GeocodeProvider;
};

const FETCH_TIMEOUT_MS = 9000;
const USER_AGENT = "ToprockCRM-Geocode/1.0 (+contact enrichment bot)";

async function fetchJson(url: string, headers: Record<string, string> = {}): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...headers },
    });
    if (!res.ok) {
      return null;
    }
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isFiniteCoord(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

// US Census Geocoder — free, no API key, US addresses only. Excellent for the
// kind of small US businesses in this CRM.
async function geocodeCensus(address: string): Promise<GeocodeResult | null> {
  const url =
    "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress" +
    `?address=${encodeURIComponent(address)}&benchmark=Public_AR_Current&format=json`;
  const data = (await fetchJson(url)) as
    | { result?: { addressMatches?: Array<{ coordinates?: { x?: number; y?: number }; matchedAddress?: string }> } }
    | null;
  const match = data?.result?.addressMatches?.[0];
  const lat = match?.coordinates?.y;
  const lng = match?.coordinates?.x;
  if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) {
    return null;
  }
  return { lat, lng, formattedAddress: match?.matchedAddress ?? null, provider: "census" };
}

// Nominatim (OpenStreetMap) — free, no key, global. Stricter usage policy
// (>= 1s between requests, required User-Agent), so batch callers should
// throttle. Fallback for addresses the Census geocoder can't resolve.
async function geocodeNominatim(address: string): Promise<GeocodeResult | null> {
  const url =
    "https://nominatim.openstreetmap.org/search" +
    `?format=json&limit=1&addressdetails=0&q=${encodeURIComponent(address)}`;
  const data = (await fetchJson(url)) as Array<{ lat?: string; lon?: string; display_name?: string }> | null;
  const hit = Array.isArray(data) ? data[0] : null;
  const lat = hit ? Number(hit.lat) : NaN;
  const lng = hit ? Number(hit.lon) : NaN;
  if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) {
    return null;
  }
  return { lat, lng, formattedAddress: hit?.display_name ?? null, provider: "nominatim" };
}

// Google Geocoding — best quality, but requires a billed API key. Only used
// when GOOGLE_GEOCODING_API_KEY (or GOOGLE_MAPS_API_KEY) is set.
async function geocodeGoogle(address: string): Promise<GeocodeResult | null> {
  const key = process.env.GOOGLE_GEOCODING_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return null;
  }
  const url =
    "https://maps.googleapis.com/maps/api/geocode/json" +
    `?address=${encodeURIComponent(address)}&key=${key}`;
  const data = (await fetchJson(url)) as
    | { status?: string; results?: Array<{ geometry?: { location?: { lat?: number; lng?: number } }; formatted_address?: string }> }
    | null;
  if (data?.status !== "OK") {
    return null;
  }
  const top = data.results?.[0];
  const lat = top?.geometry?.location?.lat;
  const lng = top?.geometry?.location?.lng;
  if (!isFiniteCoord(lat) || !isFiniteCoord(lng)) {
    return null;
  }
  return { lat, lng, formattedAddress: top?.formatted_address ?? null, provider: "google" };
}

/**
 * Geocode a free-form address to coordinates. Tries Google (if keyed), then the
 * free US Census geocoder, then Nominatim. Returns null if nothing resolves.
 */
export async function geocodeAddress(rawAddress: string): Promise<GeocodeResult | null> {
  const address = rawAddress.trim();
  if (address.length < 5) {
    return null;
  }
  return (
    (await geocodeGoogle(address)) ??
    (await geocodeCensus(address)) ??
    (await geocodeNominatim(address))
  );
}
