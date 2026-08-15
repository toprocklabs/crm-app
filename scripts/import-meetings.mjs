// Import client meeting notes (plan 006) from the committed seed pairs in
// scripts/seed/meetings/ into `meetings`, `meeting_companies` and
// `meeting_action_items`.
//
// Usage:
//   node scripts/import-meetings.mjs [--dry-run] [--force] [--only <slug>]
//
//   --dry-run  print what would happen without writing
//   --force    overwrite an existing note's body (default: keep whatever is in
//              the database, because the app can edit notes and the seed files
//              are a starting point, not the source of truth after import)
//   --only     import a single slug — used to validate one note before the rest
//
// The seed files are committed so the whole import replays from an empty
// database, the same contract as MANUAL_LINKS in scripts/map-repos.mjs. Accounts
// are referenced by name, not id, so ids never have to match across databases.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const seedDir = resolve("scripts/seed/meetings");
if (!existsSync(seedDir)) {
  console.error(`No seed directory at ${seedDir}.`);
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Accounts that must exist before the notes can land. MHM Law Firm has notes but
// was never in the CRM; the rest already exist and are matched by name.
const REQUIRED_ACCOUNTS = [
  { name: "MHM Law Firm", stage: "engaged", industry: "Legal" },
];

const VALID_STATUS = new Set(["todo", "doing", "done", "deferred"]);

async function findCompanyByName(name) {
  const rows = await sql`select id, name from companies where lower(name) = lower(${name}) limit 1`;
  return rows[0] ?? null;
}

async function ensureRequiredAccounts() {
  for (const account of REQUIRED_ACCOUNTS) {
    const existing = await findCompanyByName(account.name);
    if (existing) {
      console.log(`account ok: ${existing.name} (#${existing.id})`);
      continue;
    }
    if (dryRun) {
      console.log(`account WOULD CREATE: ${account.name} (stage ${account.stage})`);
      continue;
    }
    const created = await sql`
      insert into companies (name, stage, industry, next_step)
      values (${account.name}, ${account.stage}, ${account.industry}, ${""})
      returning id, name
    `;
    console.log(`account created: ${created[0].name} (#${created[0].id})`);
  }
}

function loadSeeds() {
  const slugs = readdirSync(seedDir)
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -5))
    .filter((slug) => !only || slug === only)
    .sort();

  return slugs.map((slug) => {
    const meta = JSON.parse(readFileSync(join(seedDir, `${slug}.json`), "utf8"));
    const bodyPath = join(seedDir, `${slug}.md`);
    if (!existsSync(bodyPath)) {
      throw new Error(`${slug}.json has no matching ${slug}.md`);
    }
    if (meta.slug !== slug) {
      throw new Error(`${slug}.json declares slug "${meta.slug}" — the file name wins, fix the JSON`);
    }
    return { ...meta, bodyMd: readFileSync(bodyPath, "utf8") };
  });
}

const seeds = loadSeeds();
if (!seeds.length) {
  console.error(only ? `No seed named "${only}".` : "No seed files found.");
  process.exit(1);
}

console.log(`${seeds.length} meeting note${seeds.length === 1 ? "" : "s"} to import${dryRun ? " (dry run)" : ""}.\n`);

await ensureRequiredAccounts();
console.log("");

let imported = 0;
let skipped = 0;
let actionItemCount = 0;

for (const seed of seeds) {
  const primary = await findCompanyByName(seed.primaryAccount);
  if (!primary) {
    console.error(`SKIP ${seed.slug}: no account named "${seed.primaryAccount}"`);
    skipped += 1;
    continue;
  }

  const secondaries = [];
  for (const name of seed.alsoAccounts ?? []) {
    const company = await findCompanyByName(name);
    if (!company) {
      console.error(`SKIP ${seed.slug}: no account named "${name}" (secondary)`);
      secondaries.length = 0;
      break;
    }
    secondaries.push(company);
  }

  const items = (seed.actionItems ?? []).map((item) => {
    const status = item.status ?? "todo";
    if (!VALID_STATUS.has(status)) {
      throw new Error(`${seed.slug}: unknown action status "${status}"`);
    }
    return { ...item, status, urgent: Boolean(item.urgent) };
  });

  const also = secondaries.length ? ` (+ ${secondaries.map((c) => c.name).join(", ")})` : "";
  console.log(`${seed.slug}\n  ${seed.meetingDate} · ${primary.name}${also} · ${items.length} action items`);

  if (dryRun) {
    imported += 1;
    actionItemCount += items.length;
    continue;
  }

  const existing = await sql`select id from meetings where slug = ${seed.slug} limit 1`;
  const keepBody = existing.length > 0 && !force;

  const upserted = await sql`
    insert into meetings (
      slug, title, meeting_date, format, status_label, tldr, body_md, company_id, source
    ) values (
      ${seed.slug}, ${seed.title}, ${seed.meetingDate}, ${seed.format ?? null},
      ${seed.statusLabel ?? null}, ${seed.tldr ?? null}, ${seed.bodyMd}, ${primary.id}, 'drive'
    )
    on conflict (slug) do update set
      title = excluded.title,
      meeting_date = excluded.meeting_date,
      format = excluded.format,
      status_label = excluded.status_label,
      tldr = excluded.tldr,
      body_md = case when ${keepBody} then meetings.body_md else excluded.body_md end,
      company_id = excluded.company_id,
      updated_at = now()
    returning id
  `;
  const meetingId = upserted[0].id;

  // Secondary accounts: replace wholesale, the seed file is authoritative.
  await sql`delete from meeting_companies where meeting_id = ${meetingId}`;
  for (const company of secondaries) {
    await sql`
      insert into meeting_companies (meeting_id, company_id)
      values (${meetingId}, ${company.id})
      on conflict do nothing
    `;
  }

  // Action items: only seed them the first time. After that the app owns their
  // status, and re-running the import must not resurrect completed homework.
  const existingItems = await sql`select count(*)::int as count from meeting_action_items where meeting_id = ${meetingId}`;
  if (existingItems[0].count > 0 && !force) {
    console.log(`  -> meeting #${meetingId}; kept ${existingItems[0].count} existing action items`);
  } else {
    if (force) {
      await sql`delete from meeting_action_items where meeting_id = ${meetingId}`;
    }
    for (const item of items) {
      await sql`
        insert into meeting_action_items (meeting_id, company_id, owner, action, status, urgent, completed_at)
        values (
          ${meetingId}, ${primary.id}, ${item.owner}, ${item.action}, ${item.status}, ${item.urgent},
          ${item.status === "done" ? new Date() : null}
        )
      `;
    }
    console.log(`  -> meeting #${meetingId}; ${items.length} action items written`);
  }

  imported += 1;
  actionItemCount += items.length;
}

console.log(
  `\nDone. ${imported} meeting${imported === 1 ? "" : "s"}, ${actionItemCount} action items${skipped ? `, ${skipped} skipped` : ""}.`,
);
