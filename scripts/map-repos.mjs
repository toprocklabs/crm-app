import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

// Links mirrored repos to accounts (plan 005, phase 1). Re-runnable: it only
// ever considers repos that are still unlinked, so running it after adding a
// client repo proposes just the new one.
//
// The slug matcher gets roughly 70% on its own. The rest need domain knowledge
// ("Riverton is in Utah"), so they live in MANUAL_LINKS below rather than being
// guessed — the whole mapping stays reproducible from an empty database.
//
//   node scripts/map-repos.mjs            # report only
//   node scripts/map-repos.mjs --apply    # write company_id / is_internal

const apply = process.argv.includes("--apply");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Toprock's own tooling. Mirrored so pushes are visible, but excluded from the
// "delivery with no account" view, which would otherwise be mostly us.
// `/^toprock/i` covers this repo under its current name (toprock-os) as well as
// toprock_brain and friends. `crm-app` is kept for the pre-plan-008 row, which
// the reconcile marks archived rather than deleting.
const INTERNAL = [/^toprock/i, /^crm-app$/i, /^proposal-creator$/i];

// Repo -> account name. Only for links the slug matcher cannot reach.
const MANUAL_LINKS = {
  "scuba-dive-riverton": "Scuba Dive Utah",
  the_scuba_dive_riverton_web: "Scuba Dive Utah",
  scubadiveapi: "Scuba Dive Utah",
};

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// Repo names carry deployment suffixes the account name never has.
const normalize = (value) =>
  slug(value)
    .replace(/-(site|web|app|website)$/, "")
    .replace(/^the-/, "");

const [repos, accounts] = await Promise.all([
  sql`select id, full_name, company_id, is_internal from project_repos where archived = false order by full_name`,
  sql`select id, name from companies order by name`,
]);

const byName = new Map(accounts.map((account) => [account.name, account]));
const proposals = [];
const internalHits = [];
const unmatched = [];

for (const repo of repos) {
  const shortName = repo.full_name.split("/").pop();

  if (INTERNAL.some((pattern) => pattern.test(shortName))) {
    if (!repo.is_internal) internalHits.push(repo);
    continue;
  }

  if (repo.company_id) continue;

  const manual = MANUAL_LINKS[shortName];
  if (manual) {
    const account = byName.get(manual);
    if (!account) {
      console.error(`MANUAL_LINKS points at a missing account: "${manual}"`);
      process.exit(1);
    }
    proposals.push({ repo, account, how: "manual" });
    continue;
  }

  const repoKey = normalize(shortName);
  const account = accounts.find((candidate) => {
    const accountKey = normalize(candidate.name);
    return (
      repoKey === accountKey ||
      repoKey.startsWith(`${accountKey}-`) ||
      accountKey.startsWith(`${repoKey}-`) ||
      repoKey.includes(accountKey) ||
      accountKey.includes(repoKey)
    );
  });

  if (account) proposals.push({ repo, account, how: "slug" });
  else unmatched.push(repo);
}

console.log(`${repos.length} active repos, ${accounts.length} accounts\n`);

console.log(`LINK (${proposals.length})`);
for (const { repo, account, how } of proposals) {
  console.log(`  ${repo.full_name}  ->  ${account.name}  [${how}]`);
}

console.log(`\nMARK INTERNAL (${internalHits.length})`);
for (const repo of internalHits) console.log(`  ${repo.full_name}`);

console.log(`\nNO ACCOUNT (${unmatched.length}) — create the account or leave unlinked`);
for (const repo of unmatched) console.log(`  ${repo.full_name}`);

const linkedAccountIds = new Set([
  ...repos.filter((repo) => repo.company_id).map((repo) => repo.company_id),
  ...proposals.map(({ account }) => account.id),
]);
const accountsWithoutRepo = accounts.filter((account) => !linkedAccountIds.has(account.id));
console.log(`\nACCOUNTS WITH NO REPO (${accountsWithoutRepo.length})`);
for (const account of accountsWithoutRepo) console.log(`  ${account.name}`);

if (!apply) {
  console.log("\nReport only. Re-run with --apply to write.");
  process.exit(0);
}

for (const { repo, account } of proposals) {
  await sql`update project_repos set company_id = ${account.id} where id = ${repo.id}`;
}
for (const repo of internalHits) {
  await sql`update project_repos set is_internal = true where id = ${repo.id}`;
}

console.log(`\nApplied: ${proposals.length} linked, ${internalHits.length} marked internal.`);
