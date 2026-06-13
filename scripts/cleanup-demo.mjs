import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// The fabricated demo records, identified by the exact names/emails the seed
// script used — so this is precise and never touches real CRM data.
const FAKE_COMPANY_NAMES = ["Scuba Riverton", "Riverton Yoga", "Riverton Coffee Co", "Summit Dental Group"];
const FAKE_CONTACT_EMAILS = ["jake@scubariverton.com", "maria@rivertonyoga.com"];

const companyRows = await sql`select id, name from companies where name = any(${FAKE_COMPANY_NAMES})`;
const contactRows = await sql`select id, first_name, last_name from contacts where email = any(${FAKE_CONTACT_EMAILS})`;

const fakeCompanyIds = companyRows.map((r) => r.id);
const fakeContactIds = contactRows.map((r) => r.id);

console.log("Will delete fabricated demo data only:");
console.log("  companies:", companyRows.map((r) => `#${r.id} ${r.name}`).join(", ") || "none");
console.log("  contacts: ", contactRows.map((r) => `#${r.id} ${r.first_name} ${r.last_name}`).join(", ") || "none");

// Delete in FK-safe order. relationships have no FK (polymorphic), so target
// them by the fake ids directly.
let relCount = 0;
if (fakeCompanyIds.length || fakeContactIds.length) {
  const compArr = fakeCompanyIds.length ? fakeCompanyIds : [-1];
  const contArr = fakeContactIds.length ? fakeContactIds : [-1];
  const del = await sql`
    delete from relationships
    where (from_type = 'company' and from_id = any(${compArr}))
       or (to_type = 'company'   and to_id   = any(${compArr}))
       or (from_type = 'contact' and from_id = any(${contArr}))
       or (to_type = 'contact'   and to_id   = any(${contArr}))
    returning id
  `;
  relCount = del.length;
}

let actCount = 0;
if (fakeCompanyIds.length) {
  const del = await sql`delete from activities where company_id = any(${fakeCompanyIds}) returning id`;
  actCount = del.length;
}

let contactCount = 0;
if (fakeContactIds.length) {
  const del = await sql`delete from contacts where id = any(${fakeContactIds}) returning id`;
  contactCount = del.length;
}

let companyCount = 0;
if (fakeCompanyIds.length) {
  const del = await sql`delete from companies where id = any(${fakeCompanyIds}) returning id`;
  companyCount = del.length;
}

console.log("\nDeleted:");
console.log(`  ${relCount} relationship(s)`);
console.log(`  ${actCount} activity record(s)`);
console.log(`  ${contactCount} contact(s)`);
console.log(`  ${companyCount} company/companies`);
console.log("\nReal CRM data (companies #1-12 and their contacts) was not touched.");
