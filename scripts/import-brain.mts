// Import the Toprock Brain (plan 007) from the committed notes in
// scripts/seed/brain/ into `brain_documents` and `brain_document_links`.
//
// Usage:
//   npm run import:brain -- [--dry-run] [--force] [--only <slug-prefix>]
//
//   --dry-run  print what would happen without writing
//   --force    overwrite an existing note's body and un-archive it (default:
//              keep whatever is in the database, because the app can edit notes
//              and the seed files are a starting point, not the source of truth
//              after import)
//   --only     import the notes whose slug starts with this — e.g. `companies`
//
// This is a ONE-TIME migration that stays replayable, not a recurring sync. The
// `toprock_brain` Obsidian vault is archived read-only once phase 3 lands; these
// committed files are what makes the import reproducible from an empty database,
// the same contract as scripts/seed/meetings/ in plan 006.
//
// Two things it must never touch, because they are curated by hand and the link
// is the expensive part (same rule as project_repos.company_id in plan 005):
//   - brain_documents.company_id / contact_id
//   - a body that has been edited in the app (without --force)
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import {
  buildSearchText,
  classify,
  deriveTitle,
  extractWikiLinks,
  parseFrontmatter,
} from "../src/lib/brain/frontmatter";

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

const seedDir = resolve("scripts/seed/brain");
if (!existsSync(seedDir)) {
  console.error(`No seed directory at ${seedDir}.`);
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Which note wins when two share a title. The vault genuinely duplicates five
// businesses across Clients/ and Companies/ (Coatary, Peaceful Property
// Management, South Pointe Dental, Surf n Sport Chiro, The Scuba Dive Riverton),
// so a bare [[Coatary]] is ambiguous. Company beats client-folder copy; both
// still import, and the duplication is reported rather than hidden.
const FOLDER_PRIORITY = ["Companies", "Clients", "People", "Projects", "Root"];

function priorityOf(folder: string): number {
  const index = FOLDER_PRIORITY.indexOf(folder);
  return index === -1 ? FOLDER_PRIORITY.length : index;
}

/** Vault-relative, forward-slashed paths for every .md under the seed dir. */
function walk(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(join(dir, entry.name), rel));
    else if (entry.name.toLowerCase().endsWith(".md")) out.push(rel);
  }
  return out;
}

type Note = {
  path: string;
  slug: string;
  title: string;
  kind: string;
  folder: string;
  noteDate: string | null;
  bodyMd: string;
  frontmatter: Record<string, string | string[]>;
  contentSha: string;
  searchText: string;
  links: string[];
};

function loadNotes(): Note[] {
  return walk(seedDir)
    .map((path): Note => {
      const raw = readFileSync(join(seedDir, path), "utf8");
      const { frontmatter, body } = parseFrontmatter(raw);
      const { slug, kind, folder, noteDate, stem } = classify(path);
      const title = deriveTitle(frontmatter, stem);
      return {
        path,
        slug,
        title,
        kind,
        folder,
        noteDate,
        bodyMd: body,
        frontmatter,
        // Over the whole source file, so a frontmatter-only edit still counts
        // as a change. This tracks "what the seed file was when last imported",
        // never what the app currently holds.
        contentSha: createHash("sha256").update(raw).digest("hex"),
        searchText: buildSearchText(title, body),
        links: extractWikiLinks(body),
      };
    })
    .filter((note) => !only || note.slug.startsWith(only));
}

const notes = loadNotes();
if (!notes.length) {
  console.error(only ? `No notes with a slug starting "${only}".` : "No seed notes found.");
  process.exit(1);
}

// A slug collision would make two notes fight over one URL. Fail before writing
// anything rather than let the second upsert lose to a unique-index error
// halfway through the run.
const bySlug = new Map<string, Note[]>();
for (const note of notes) bySlug.set(note.slug, [...(bySlug.get(note.slug) ?? []), note]);
const collisions = [...bySlug.entries()].filter(([, group]) => group.length > 1);
if (collisions.length) {
  console.error(`${collisions.length} slug collision(s) — refusing to import:`);
  for (const [slug, group] of collisions) {
    console.error(`  ${slug}\n    ${group.map((n) => n.path).join("\n    ")}`);
  }
  process.exit(1);
}

const kinds = notes.reduce<Record<string, number>>((acc, n) => {
  acc[n.kind] = (acc[n.kind] ?? 0) + 1;
  return acc;
}, {});
const withFrontmatter = notes.filter((n) => Object.keys(n.frontmatter).length > 0).length;
const linkCount = notes.reduce((sum, n) => sum + n.links.length, 0);

console.log(
  `${notes.length} brain note${notes.length === 1 ? "" : "s"} to import${dryRun ? " (dry run)" : ""}.\n` +
    `  ${withFrontmatter} with frontmatter · ${notes.length - withFrontmatter} without\n` +
    `  ${Object.entries(kinds).map(([k, n]) => `${n} ${k}`).join(" · ")}\n` +
    `  ${linkCount} wiki-links · 0 slug collisions\n`,
);

// Duplicate titles are not an error — they are the vault duplicating itself, and
// worth saying out loud since they make [[links]] ambiguous.
const byTitle = new Map<string, Note[]>();
for (const note of notes) {
  const key = note.title.toLowerCase();
  byTitle.set(key, [...(byTitle.get(key) ?? []), note]);
}
const dupTitles = [...byTitle.entries()].filter(([, group]) => group.length > 1);
if (dupTitles.length) {
  console.log(`${dupTitles.length} duplicate title(s) — links resolve to the higher-priority folder:`);
  for (const [, group] of dupTitles) {
    const sorted = [...group].sort((a, b) => priorityOf(a.folder) - priorityOf(b.folder));
    console.log(`  "${sorted[0].title}" → ${sorted[0].path}  (also ${sorted.slice(1).map((n) => n.path).join(", ")})`);
  }
  console.log("");
}

let created = 0;
let updated = 0;
let unchanged = 0;
let bodiesKept = 0;

/** path → row id, for the link pass. */
const idByPath = new Map<string, number>();

for (const note of notes) {
  const existingRows = dryRun
    ? []
    : await sql`select id, content_sha, body_md from brain_documents where path = ${note.path} limit 1`;
  const existing = existingRows[0] ?? null;

  if (dryRun) {
    console.log(
      `  ${note.kind.padEnd(6)} ${(note.noteDate ?? "—").padEnd(11)} ${note.slug.padEnd(46)} ` +
        `"${note.title}" · ${note.links.length} links`,
    );
    created += 1;
    continue;
  }

  if (existing && existing.content_sha === note.contentSha && !force) {
    unchanged += 1;
    idByPath.set(note.path, existing.id);
    continue;
  }

  // The contract that makes re-import safe: an app edit outlives the importer.
  const keepBody = Boolean(existing) && !force;
  if (keepBody && existing.body_md !== note.bodyMd) bodiesKept += 1;

  const rows = await sql`
    insert into brain_documents (
      path, slug, title, kind, folder, note_date, body_md, frontmatter,
      content_sha, search_text, source
    ) values (
      ${note.path}, ${note.slug}, ${note.title}, ${note.kind}, ${note.folder},
      ${note.noteDate}, ${note.bodyMd}, ${JSON.stringify(note.frontmatter)},
      ${note.contentSha}, ${note.searchText}, 'manual'
    )
    on conflict (path) do update set
      slug = excluded.slug,
      title = excluded.title,
      kind = excluded.kind,
      folder = excluded.folder,
      note_date = excluded.note_date,
      body_md = case when ${keepBody} then brain_documents.body_md else excluded.body_md end,
      frontmatter = excluded.frontmatter,
      content_sha = excluded.content_sha,
      search_text = case when ${keepBody} then brain_documents.search_text else excluded.search_text end,
      archived_at = case when ${force} then null else brain_documents.archived_at end,
      updated_at = now()
    returning id
  `;
  // company_id, contact_id and source are absent from the update list on
  // purpose. They are curated, and the import must never clobber them.

  idByPath.set(note.path, rows[0].id);
  if (existing) updated += 1;
  else created += 1;
}

if (dryRun) {
  console.log(`\nDry run: ${created} note(s) would be imported. Nothing written.`);
  process.exit(0);
}

// ---- Links -----------------------------------------------------------------
// Rebuilt wholesale for the notes in this run: a body edit can add or remove a
// [[link]], and there is no stable per-link identity to upsert against.

// Resolve against every document in the database, not just this run's notes, so
// an --only run still links out to notes imported earlier.
const allDocs = await sql`select id, path, title, slug, folder from brain_documents`;
const targetIndex = new Map<string, { id: number; priority: number }>();
for (const doc of allDocs) {
  for (const key of [doc.title.toLowerCase(), doc.slug.toLowerCase(), doc.path.toLowerCase()]) {
    const candidate = { id: doc.id, priority: priorityOf(doc.folder) };
    const current = targetIndex.get(key);
    if (!current || candidate.priority < current.priority) targetIndex.set(key, candidate);
  }
}

let linksWritten = 0;
let dangling = 0;

for (const note of notes) {
  const sourceId = idByPath.get(note.path);
  if (!sourceId) continue;

  await sql`delete from brain_document_links where source_doc_id = ${sourceId}`;
  for (const rawTarget of note.links) {
    const resolved = targetIndex.get(rawTarget.toLowerCase()) ?? null;
    if (!resolved) dangling += 1;
    await sql`
      insert into brain_document_links (source_doc_id, raw_target, target_doc_id)
      values (${sourceId}, ${rawTarget}, ${resolved ? resolved.id : null})
    `;
    linksWritten += 1;
  }
}

console.log(
  `\nDone. ${created} created · ${updated} updated · ${unchanged} unchanged (sha match)` +
    (bodiesKept ? `\n${bodiesKept} edited bod${bodiesKept === 1 ? "y" : "ies"} preserved — re-run with --force to overwrite.` : "") +
    `\n${linksWritten} link(s) written, ${dangling} dangling (no note with that title yet).`,
);
