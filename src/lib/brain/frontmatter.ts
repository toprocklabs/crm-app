// Pure parsing for brain notes imported from the `toprock_brain` vault (plan 007).
//
// Every function here is deliberately tolerant, because the vault is not
// consistent and never was. Measured across its 69 notes:
//
//   - ~30 have NO frontmatter at all (every dated digest under Journal/,
//     Drive/, Pipeline/, Delivery/, Sources/, Code/).
//   - The ones that do disagree with each other: `name` (34 notes) vs `title`
//     (4), `type: person` vs `tags: [person]` (37), `status` on 26.
//
// So classification keys on the three signals that ARE consistent — the folder,
// the "YYYY-MM-DD " filename prefix, and the [[wiki-links]] in the body — and
// frontmatter is treated as a bonus bag of keys, never as a precondition.
//
// No I/O here on purpose: the import script reads files, this module decides
// what they mean, and tests/brain-frontmatter.test.ts covers it without a disk.

import type { BrainDocKind } from "@/lib/schema";

/** One note per thing, long-lived, usually with frontmatter. */
const ENTITY_FOLDERS = new Set(["Companies", "People", "Projects", "Clients"]);
/** Run status rather than content — ingest bookkeeping. */
const META_FOLDERS = new Set(["Sources"]);
/** A note at the vault root (currently just Welcome.md). */
const ROOT_FOLDER = "Root";

export type FrontmatterValue = string | string[];
export type Frontmatter = Record<string, FrontmatterValue>;

export type Classification = {
  folder: string;
  kind: BrainDocKind;
  /** "YYYY-MM-DD" from the filename prefix, or null on an entity note. */
  noteDate: string | null;
  /** Filename without its extension — the fallback title. */
  stem: string;
  /** URL identity: "companies/coatary", "drive/2026-04-24-drive-digest". */
  slug: string;
};

// A date prefix is only a date prefix at the START of the filename, and is
// either the whole name (Journal/2026-04-24.md) or followed by a space.
const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})(?: |$)/;

/**
 * Split a note into its frontmatter block and its body.
 *
 * Returns an empty frontmatter object when the note has none, which is the
 * common case — the caller must not branch on "has frontmatter" to decide
 * whether the note is importable.
 */
export function parseFrontmatter(raw: string): { frontmatter: Frontmatter; body: string } {
  const text = raw.replace(/^﻿/, "").replace(/\r\n/g, "\n");

  // The block must open on the very first line, or there isn't one.
  if (!text.startsWith("---\n")) {
    return { frontmatter: {}, body: text.trimStart() };
  }

  const end = text.indexOf("\n---", 3);
  if (end === -1) {
    // An opening fence with no closing fence is a body that happens to start
    // with a rule, not a broken header. Treat it as content.
    return { frontmatter: {}, body: text.trimStart() };
  }

  const block = text.slice(4, end);
  // Step past the whole closing-fence line rather than a fixed four characters,
  // so trailing whitespace after the "---" doesn't leak into the body. Then drop
  // the blank line every note puts between the fence and its first heading.
  const fenceLineEnd = text.indexOf("\n", end + 1);
  const body = fenceLineEnd === -1 ? "" : text.slice(fenceLineEnd + 1).replace(/^\n+/, "");
  return { frontmatter: parseBlock(block), body };
}

// A deliberately small YAML subset — scalars, inline `[a, b]` lists, and block
// `- item` lists. Anything richer (nesting, anchors, multi-line scalars) does
// not appear in the vault, and guessing at it would be worse than ignoring it.
function parseBlock(block: string): Frontmatter {
  const out: Frontmatter = {};
  let currentKey: string | null = null;

  for (const line of block.split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;

    // Continuation of a block list: "  - Scuba Dive Utah"
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item && currentKey) {
      const existing = out[currentKey];
      const value = unquote(item[1]);
      out[currentKey] = Array.isArray(existing) ? [...existing, value] : [value];
      continue;
    }

    const pair = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/.exec(line);
    if (!pair) continue;

    const [, key, rawValue] = pair;
    currentKey = key;
    const value = rawValue.trim();

    if (value === "") {
      // "email:" with nothing after it — either an empty scalar or the head of
      // a block list. Seed it empty; a following "- item" line will replace it.
      out[key] = "";
      continue;
    }

    if (value.startsWith("[") && value.endsWith("]")) {
      out[key] = value
        .slice(1, -1)
        .split(",")
        .map((part) => unquote(part.trim()))
        .filter(Boolean);
      continue;
    }

    out[key] = unquote(value);
  }

  return out;
}

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

/**
 * Decide what a note is from its path alone.
 *
 * `path` is vault-relative and forward-slashed: "Companies/Coatary.md".
 */
export function classify(path: string): Classification {
  const normalized = path.replace(/\\/g, "/").replace(/^\.?\//, "");
  const segments = normalized.split("/");
  const file = segments.pop() ?? normalized;
  const folder = segments.length ? segments.join("/") : ROOT_FOLDER;
  const stem = file.replace(/\.md$/i, "");

  const dateMatch = DATE_PREFIX.exec(stem);
  const noteDate = dateMatch ? dateMatch[1] : null;

  return {
    folder,
    kind: kindForFolder(folder),
    noteDate,
    stem,
    slug: slugForPath(folder, stem),
  };
}

function kindForFolder(folder: string): BrainDocKind {
  if (META_FOLDERS.has(folder)) return "meta";
  if (ENTITY_FOLDERS.has(folder) || folder === ROOT_FOLDER) return "entity";
  return "digest";
}

function slugForPath(folder: string, stem: string): string {
  const tail = slugify(stem);
  if (folder === ROOT_FOLDER) return tail;
  return `${slugify(folder)}/${tail}`;
}

/** Lowercase, non-alphanumerics collapsed to single hyphens, trimmed. */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The note's display title.
 *
 * `title` and `name` both appear in the vault and mean the same thing; neither
 * is present on a digest, where the filename is the title.
 */
export function deriveTitle(frontmatter: Frontmatter, stem: string): string {
  for (const key of ["title", "name"]) {
    const value = frontmatter[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return stem;
}

/**
 * Every [[wiki-link]] target in a body, in order, de-duplicated.
 *
 * Handles Obsidian's alias form — [[Real Note|shown text]] links to "Real Note".
 * Embeds (![[...]]) are links too; the leading bang is simply not matched.
 */
export function extractWikiLinks(body: string): string[] {
  const targets: string[] = [];
  const seen = new Set<string>();
  const pattern = /\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;

  let match = pattern.exec(body);
  while (match) {
    const target = match[1].trim();
    if (target) {
      const key = target.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        targets.push(target);
      }
    }
    match = pattern.exec(body);
  }

  return targets;
}

/**
 * Flatten a note into plain words for the full-text index.
 *
 * Markdown punctuation is noise to `to_tsvector` and actively harmful for
 * ranking — a note is not "about" pipes and hashes. Wiki-link and link targets
 * are kept as words, because searching for a linked name should find the notes
 * that mention it.
 */
export function buildSearchText(title: string, body: string): string {
  const stripped = body
    .replace(/```[\s\S]*?```/g, " ") // fenced code
    .replace(/!?\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]*))?\]\]/g, "$1 $2") // wiki-links
    .replace(/!?\[([^\]]*)\]\(([^)]*)\)/g, "$1") // inline links, drop the href
    .replace(/^\s{0,3}#{1,6}\s+/gm, " ") // heading markers
    .replace(/^\s*[-*+]\s+(\[[ xX]\]\s*)?/gm, " ") // bullets and task boxes
    .replace(/^\s*>\s?/gm, " ") // blockquotes
    .replace(/^\s*(-{3,}|\*{3,}|={3,})\s*$/gm, " ") // rules
    .replace(/[|`*_~]/g, " ") // table pipes, emphasis, code ticks
    .replace(/\s+/g, " ");

  return `${title} ${stripped}`.trim();
}
