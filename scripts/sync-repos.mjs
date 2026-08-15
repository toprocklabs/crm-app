import { execFileSync } from "node:child_process";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

// Read-only mirror of the GitHub org's repos into `project_repos` (plan 005).
// One request covers every repo (the org listing carries `pushed_at`), so a full
// sync costs 1-2 API calls against a 5,000/hour budget.
//
// Reconcile, never append-and-forget: repos that disappear from the listing are
// marked archived rather than deleted, so a rename leaves one dormant row and
// one new row instead of losing the account link silently.
//
//   node scripts/sync-repos.mjs [--dry-run]

const dryRun = process.argv.includes("--dry-run");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const org = process.env.GITHUB_ORG || "toprocklabs";

// The deployed app needs GITHUB_TOKEN. Locally, fall back to the gh CLI's token
// so a developer with `gh auth login` already done needs no extra setup.
function resolveToken() {
  if (process.env.GITHUB_TOKEN) {
    return { token: process.env.GITHUB_TOKEN, source: "GITHUB_TOKEN" };
  }

  try {
    const token = execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      shell: process.platform === "win32",
    }).trim();
    if (token) {
      return { token, source: "gh auth token" };
    }
  } catch {
    // gh missing or not logged in — fall through to the error below.
  }

  console.error(
    "No GitHub credentials. Set GITHUB_TOKEN in .env.local, or run `gh auth login`.",
  );
  process.exit(1);
}

const { token, source } = resolveToken();

async function fetchAllRepos() {
  const repos = [];

  for (let page = 1; page <= 10; page += 1) {
    const url = `https://api.github.com/orgs/${org}/repos?per_page=100&type=all&sort=pushed&page=${page}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "toprock-crm-sync",
      },
    });

    if (!response.ok) {
      throw new Error(
        `GitHub ${response.status} ${response.statusText}: ${await response.text()}`,
      );
    }

    const batch = await response.json();
    repos.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }

  return repos;
}

const repos = await fetchAllRepos();
console.log(`Fetched ${repos.length} repos from ${org} (auth: ${source})`);

const existing = await sql`select full_name, company_id, archived from project_repos`;
const known = new Map(existing.map((row) => [row.full_name, row]));
const seen = new Set();

let inserted = 0;
let updated = 0;

for (const repo of repos) {
  seen.add(repo.full_name);
  const isNew = !known.has(repo.full_name);

  if (dryRun) {
    if (isNew) inserted += 1;
    else updated += 1;
    continue;
  }

  // company_id and is_internal are curated by hand and must survive a sync, so
  // they are deliberately absent from the update set.
  await sql`
    insert into project_repos (full_name, is_private, archived, html_url, last_push_at, synced_at)
    values (
      ${repo.full_name},
      ${Boolean(repo.private)},
      ${Boolean(repo.archived)},
      ${repo.html_url ?? null},
      ${repo.pushed_at ?? null},
      now()
    )
    on conflict (full_name) do update set
      is_private = excluded.is_private,
      archived = excluded.archived,
      html_url = excluded.html_url,
      last_push_at = excluded.last_push_at,
      synced_at = now()
  `;

  if (isNew) inserted += 1;
  else updated += 1;
}

// Anything we have a row for but GitHub no longer lists (deleted, transferred,
// renamed, or access revoked) goes dormant. Never deleted — the account link is
// the expensive part and we don't throw it away over a transient 404.
const vanished = existing.filter((row) => !seen.has(row.full_name) && !row.archived);
if (vanished.length > 0 && !dryRun) {
  for (const row of vanished) {
    await sql`update project_repos set archived = true, synced_at = now() where full_name = ${row.full_name}`;
  }
}

console.log(
  `${dryRun ? "[dry-run] " : ""}${inserted} inserted, ${updated} updated, ${vanished.length} marked archived`,
);

if (vanished.length > 0) {
  console.log(`  archived: ${vanished.map((row) => row.full_name).join(", ")}`);
}

const unlinked = await sql`
  select count(*)::int as n from project_repos
  where company_id is null and is_internal = false and archived = false
`;
console.log(`${unlinked[0].n} active repos are not linked to an account`);
