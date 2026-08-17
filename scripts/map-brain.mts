// Links brain notes to accounts and contacts (plan 007). Re-runnable: it only
// ever considers notes that are still unlinked, so running it after importing a
// new note proposes just that one, and a link curated by hand is never touched.
//
//   npm run map:brain            # report only
//   npm run map:brain -- --apply # write company_id / contact_id
//
// The name matcher gets most of it. The rest need domain knowledge Toprock has
// and a string comparison doesn't ("MacArthur, Heder & Metler" is the firm the
// CRM calls "MHM Law Firm"), so those live in MANUAL_LINKS below rather than
// being guessed — the whole mapping stays reproducible from an empty database.
// Same shape and the same reasoning as scripts/map-repos.mjs in plan 005.
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

const apply = process.argv.includes("--apply");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Note-name -> account name. Only for links the matcher cannot reach.
const MANUAL_LINKS: Record<string, string> = {
  // The vault kept the trading name; the CRM uses the legal one. Same call
  // map-repos.mjs makes for the scuba-dive-riverton repos.
  "The Scuba Dive Riverton": "Scuba Dive Utah",
  // Initials. No amount of normalising gets from one to the other.
  "MacArthur, Heder & Metler": "MHM Law Firm",
  // The CRM name carries a suffix the vault's doesn't.
  "Vive Massage": "Vive Massage Spa",
};

const norm = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the /, "");

type Doc = {
  id: number;
  path: string;
  title: string;
  kind: string;
  folder: string;
  company_id: number | null;
  contact_id: number | null;
  fm_company: string | null;
  fm_client: string | null;
};

type Named = { id: number; name: string };

// The neon driver types every row as Record<string, any>, so the shapes above
// are asserted once here rather than at each use site.
const [docRows, accountRows, contactRows] = await Promise.all([
  sql`
    select id, path, title, kind, folder, company_id, contact_id,
           frontmatter->>'company' as fm_company,
           frontmatter->>'client'  as fm_client
    from brain_documents
    where archived_at is null
    order by path
  `,
  sql`select id, name from companies order by name`,
  // `contacts` stores first/last separately; brain People notes are titled with
  // the whole name ("Flint Gardner"), so join it here rather than at every use.
  sql`
    select id, trim(first_name || ' ' || last_name) as name
    from contacts order by last_name, first_name
  `,
]);

const docs = docRows as Doc[];
const accounts = accountRows as Named[];
const contacts = contactRows as Named[];

const accountByNorm = new Map(accounts.map((a) => [norm(a.name), a]));
const contactByNorm = new Map(contacts.map((c) => [norm(c.name), c]));

function resolveAccount(name: string | null): { id: number; name: string } | null {
  if (!name || !name.trim()) return null;
  const manual = MANUAL_LINKS[name.trim()];
  if (manual) return accountByNorm.get(norm(manual)) ?? null;
  return accountByNorm.get(norm(name)) ?? null;
}

/**
 * Which name on a note identifies the account it belongs to.
 *
 * Digests are deliberately excluded. A Drive or Journal digest sweeps several
 * clients at once, so pinning it to one account would assert something the note
 * doesn't say — the same reasoning that gave plan 006 a `meeting_companies`
 * join table rather than a single owner. They stay unlinked and searchable.
 */
function accountNameFor(doc: Doc): string | null {
  if (doc.kind !== "entity") return null;
  if (doc.folder === "Companies" || doc.folder === "Clients") return doc.title;
  return doc.fm_company ?? doc.fm_client ?? null;
}

const companyProposals: { doc: Doc; account: { id: number; name: string } }[] = [];
const contactProposals: { doc: Doc; contact: { id: number; name: string } }[] = [];
const unmatched: { doc: Doc; wanted: string }[] = [];
let alreadyLinked = 0;
let skippedDigests = 0;

for (const doc of docs) {
  if (doc.kind !== "entity") {
    skippedDigests += 1;
    continue;
  }

  // People notes can also name a contact the CRM already knows.
  if (doc.folder === "People" && !doc.contact_id) {
    const contact = contactByNorm.get(norm(doc.title));
    if (contact) contactProposals.push({ doc, contact });
  }

  if (doc.company_id) {
    alreadyLinked += 1;
    continue;
  }

  const wanted = accountNameFor(doc);
  if (!wanted) continue;

  const account = resolveAccount(wanted);
  if (account) companyProposals.push({ doc, account });
  else unmatched.push({ doc, wanted });
}

console.log(
  `${docs.length} notes · ${skippedDigests} digests/meta skipped (a digest spans several clients) · ` +
    `${alreadyLinked} already linked\n`,
);

console.log(`${companyProposals.length} account link(s)${apply ? "" : " proposed"}:`);
for (const { doc, account } of companyProposals) {
  console.log(`  ${doc.path.padEnd(48)} → #${account.id} ${account.name}`);
}

if (contactProposals.length) {
  console.log(`\n${contactProposals.length} contact link(s)${apply ? "" : " proposed"}:`);
  for (const { doc, contact } of contactProposals) {
    console.log(`  ${doc.path.padEnd(48)} → contact #${contact.id} ${contact.name}`);
  }
}

if (unmatched.length) {
  console.log(`\n${unmatched.length} note(s) name an account the CRM does not have:`);
  for (const { doc, wanted } of unmatched) {
    console.log(`  ${doc.path.padEnd(48)} wants "${wanted}"`);
  }
  console.log(
    "  → Either create the account in the CRM, or add it to MANUAL_LINKS if it is\n" +
      "    an existing account under a different name. Left unlinked for now, which\n" +
      "    is safe: an unlinked note is still searchable at /brain.",
  );
}

if (!apply) {
  console.log("\nReport only. Re-run with --apply to write.");
  process.exit(0);
}

for (const { doc, account } of companyProposals) {
  // `is null` in the predicate, not just in the proposal filter: two runs racing
  // must never have the second overwrite a link the first curated.
  await sql`
    update brain_documents set company_id = ${account.id}, updated_at = now()
    where id = ${doc.id} and company_id is null
  `;
}
for (const { doc, contact } of contactProposals) {
  await sql`
    update brain_documents set contact_id = ${contact.id}, updated_at = now()
    where id = ${doc.id} and contact_id is null
  `;
}

console.log(`\nApplied: ${companyProposals.length} account link(s), ${contactProposals.length} contact link(s).`);
