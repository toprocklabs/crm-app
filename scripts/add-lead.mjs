import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

const name = process.argv[2];
if (!name) {
  console.error("Usage: node scripts/add-lead.mjs <account name>");
  process.exit(1);
}

const existing = await sql`select id, stage from companies where lower(name) = lower(${name}) limit 1`;
if (existing.length) {
  console.log(`Already exists: #${existing[0].id} ${name} (stage: ${existing[0].stage}). No insert.`);
  process.exit(0);
}

const [row] = await sql`
  insert into companies (name, stage)
  values (${name}, 'new_lead')
  returning id, name, stage
`;
console.log(`Added lead #${row.id}: ${row.name} (stage: ${row.stage})`);
