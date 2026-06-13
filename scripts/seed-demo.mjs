import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Idempotent upserts so the script is safe to re-run.
async function upsertCompany({ name, stage, address, lat, lng, plazaKey, nextStep }) {
  const existing = await sql`select id from companies where name = ${name} limit 1`;
  if (existing.length) {
    await sql`
      update companies
      set stage = ${stage}::account_stage,
          address = ${address},
          lat = ${lat},
          lng = ${lng},
          plaza_key = ${plazaKey},
          next_step = ${nextStep ?? ""}
      where id = ${existing[0].id}
    `;
    return existing[0].id;
  }
  const rows = await sql`
    insert into companies (name, stage, address, lat, lng, plaza_key, next_step)
    values (${name}, ${stage}::account_stage, ${address}, ${lat}, ${lng}, ${plazaKey}, ${nextStep ?? ""})
    returning id
  `;
  return rows[0].id;
}

async function upsertContact({ firstName, lastName, email, title, companyId }) {
  const rows = await sql`
    insert into contacts (first_name, last_name, email, title, company_id)
    values (${firstName}, ${lastName}, ${email}, ${title}, ${companyId})
    on conflict (email) do update
      set first_name = excluded.first_name,
          last_name = excluded.last_name,
          title = excluded.title,
          company_id = excluded.company_id
    returning id
  `;
  return rows[0].id;
}

async function upsertEdge({ fromType, fromId, toType, toId, edgeType, strength, evidence }) {
  await sql`
    insert into relationships (from_type, from_id, to_type, to_id, edge_type, strength, evidence, source)
    values (
      ${fromType}::entity_type, ${fromId},
      ${toType}::entity_type, ${toId},
      ${edgeType}::edge_type, ${strength}, ${evidence}, 'manual'::data_source
    )
    on conflict (from_type, from_id, to_type, to_id, edge_type) do update
      set strength = excluded.strength,
          evidence = excluded.evidence,
          last_confirmed_at = now()
  `;
}

// --- The Scuba Riverton plaza scenario from the plan ---

// A won customer: your beachhead in the plaza.
const scubaId = await upsertCompany({
  name: "Scuba Riverton",
  stage: "customer",
  address: "123 Riverton Plaza, Riverton, UT 84065",
  lat: 40.5219,
  lng: -111.9391,
  plazaKey: "riverton-plaza",
  nextStep: "Quarterly check-in",
});

// The prospect next door — the one we want to land warm.
const yogaId = await upsertCompany({
  name: "Riverton Yoga",
  stage: "new_lead",
  address: "125 Riverton Plaza, Riverton, UT 84065",
  lat: 40.52195,
  lng: -111.93905,
  plazaKey: "riverton-plaza",
  nextStep: "Find a warm intro",
});

// Another neighbor in the same plaza.
const coffeeId = await upsertCompany({
  name: "Riverton Coffee Co",
  stage: "attempting_to_engage",
  address: "121 Riverton Plaza, Riverton, UT 84065",
  lat: 40.52188,
  lng: -111.9392,
  plazaKey: "riverton-plaza",
  nextStep: "Drop by for an intro",
});

// A second, unrelated customer so the graph has more than one trust anchor.
const dentalId = await upsertCompany({
  name: "Summit Dental Group",
  stage: "customer",
  address: "900 Summit Center, Draper, UT 84020",
  lat: 40.53,
  lng: -111.9,
  plazaKey: "summit-center",
  nextStep: "Renewal in Q3",
});

// People: the two plaza owners who know each other.
const jakeId = await upsertContact({
  firstName: "Jake",
  lastName: "Morales",
  email: "jake@scubariverton.com",
  title: "Owner",
  companyId: scubaId,
});

const mariaId = await upsertContact({
  firstName: "Maria",
  lastName: "Chen",
  email: "maria@rivertonyoga.com",
  title: "Owner",
  companyId: yogaId,
});

// Edges:
// 1) The plaza tie — Riverton Yoga is colocated with our customer Scuba Riverton.
await upsertEdge({
  fromType: "company",
  fromId: yogaId,
  toType: "company",
  toId: scubaId,
  edgeType: "colocated_with",
  strength: 88,
  evidence: "Same Riverton Plaza strip, two units over",
});

// 2) Coffee Co also shares the plaza.
await upsertEdge({
  fromType: "company",
  fromId: coffeeId,
  toType: "company",
  toId: scubaId,
  edgeType: "colocated_with",
  strength: 80,
  evidence: "Two doors down from Scuba Riverton",
});

// 3) The personal tie — Jake (our champion) knows Maria (the prospect's owner).
await upsertEdge({
  fromType: "contact",
  fromId: jakeId,
  toType: "contact",
  toId: mariaId,
  edgeType: "knows",
  strength: 72,
  evidence: "Coffee 3/14 — Jake offered to introduce us",
});

console.log("Demo seeded:");
console.log(`  Scuba Riverton (customer)      /accounts/${scubaId}`);
console.log(`  Riverton Yoga (prospect)       /accounts/${yogaId}   <- open this to see warm paths`);
console.log(`  Riverton Coffee Co (prospect)  /accounts/${coffeeId}`);
console.log(`  Summit Dental Group (customer) /accounts/${dentalId}`);
console.log("");
console.log("Riverton Yoga should show two warm paths to Scuba Riverton:");
console.log("  - 1 hop via colocated_with (the plaza)");
console.log("  - via Maria -> knows -> Jake -> Scuba Riverton (the people)");
console.log("  ...plus plaza neighbors (Scuba Riverton, Riverton Coffee Co).");
