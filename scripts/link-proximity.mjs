import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Auto-derive `colocated_with` relationship edges from geocoded coordinates.
// Any two companies within RADIUS_M of each other get a typed, weighted edge so
// findWarmPaths() (src/lib/graph.ts) can route warm intros through a customer
// who shares a strip/plaza with a prospect. Idempotent: re-running upserts the
// same edges (one canonical row per pair; the graph traversal walks both ways).

const RADIUS_M = 150;

// Distance -> strength: touching (0m) is ~90, edge of radius (150m) is ~60.
function proximityStrength(distanceMeters) {
  const s = Math.round(90 - (distanceMeters / RADIUS_M) * 30);
  return Math.max(0, Math.min(100, s));
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (d) => (d * Math.PI) / 180;
function haversineMeters(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

const rows = await sql`
  select id, name, address, lat, lng
  from companies
  where lat is not null and lng is not null
  order by id
`;

console.log(`${rows.length} geocoded account(s). Linking pairs within ${RADIUS_M}m.\n`);

let created = 0;
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i];
    const b = rows[j];
    const distance = haversineMeters(a, b);
    if (distance > RADIUS_M) {
      continue;
    }

    const strength = proximityStrength(distance);
    const sameAddress =
      a.address && b.address && a.address.replace(/\s+/g, " ").trim().toLowerCase() ===
        b.address.replace(/\s+/g, " ").trim().toLowerCase();
    const evidence = sameAddress
      ? `Same address (${a.address}) — geocoded ${distance.toFixed(0)}m apart`
      : `Geocoded ${distance.toFixed(0)}m apart (same strip/plaza)`;

    // Canonical orientation (lower id -> higher id) so we store one row per pair.
    const [fromId, toId] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];

    await sql`
      insert into relationships (from_type, from_id, to_type, to_id, edge_type, strength, evidence, source)
      values ('company'::entity_type, ${fromId}, 'company'::entity_type, ${toId},
              'colocated_with'::edge_type, ${strength}, ${evidence}, 'agent'::data_source)
      on conflict (from_type, from_id, to_type, to_id, edge_type) do update
        set strength = excluded.strength,
            evidence = excluded.evidence,
            last_confirmed_at = now()
    `;
    created++;
    console.log(`  ${a.name} <-> ${b.name}: ${distance.toFixed(0)}m, strength ${strength}`);
  }
}

console.log(`\nDone. ${created} colocated_with edge(s) upserted.`);
if (created === 0) {
  console.log("No accounts are within range yet — geocode more accounts first (npm run enrich:real).");
}
