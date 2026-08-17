import { createHash } from "node:crypto";
import { and, eq, ne, or } from "drizzle-orm";
import { buildSearchText, classify, deriveTitle, type Frontmatter } from "@/lib/brain/frontmatter";
import { rebuildDocumentLinks, resolveDanglingLinksTo } from "@/lib/brain/links";
import type { Db } from "@/lib/define-action";
import { brainDocuments } from "@/lib/schema";

// Shared write path for brain notes (plan 007, phase 2).
//
// Used by the agent ingest API. Everything derived from a note — kind, folder,
// date, slug, search text, the link graph — is derived HERE, so an agent-written
// note is indistinguishable from an imported one and nothing has to be kept in
// step by hand across call sites.

export type UpsertResult =
  | { ok: true; created: boolean; id: number; slug: string; path: string; contentSha: string }
  | { ok: false; conflict: "manual_authored" | "sha_mismatch" | "exists"; existing: { slug: string; contentSha: string; source: string } };

export function shaOf(body: string) {
  return createHash("sha256").update(body).digest("hex");
}

/**
 * Create or replace a note addressed by its vault path.
 *
 * Ownership rules, in the order they are checked:
 *   - `createOnly` and the note exists  → refuse. Lets an agent guarantee a note
 *     exists ("People/Austin.md") without ever clobbering a human's copy.
 *   - `expectedSha` supplied            → refuse unless it matches. This is the
 *     read-modify-write path: an agent appending to a human's journal must have
 *     read the current body first.
 *   - Existing note is `source: 'manual'` and no `expectedSha` → refuse. A blind
 *     agent write must never overwrite something a person wrote.
 *   - Otherwise                         → the agent owns this path; replace.
 */
export async function upsertBrainDocument(
  db: Db,
  input: {
    path: string;
    bodyMd: string;
    title?: string;
    frontmatter?: Frontmatter;
    companyId?: number | null;
    source?: "manual" | "agent";
    createOnly?: boolean;
    expectedSha?: string;
  },
): Promise<UpsertResult> {
  const { slug: baseSlug, kind, folder, noteDate, stem } = classify(input.path);
  const title = input.title?.trim() || deriveTitle(input.frontmatter ?? {}, stem);
  const contentSha = shaOf(input.bodyMd);

  const [existing] = await db
    .select({
      id: brainDocuments.id,
      slug: brainDocuments.slug,
      source: brainDocuments.source,
      contentSha: brainDocuments.contentSha,
      bodyMd: brainDocuments.bodyMd,
    })
    .from(brainDocuments)
    .where(eq(brainDocuments.path, input.path))
    .limit(1);

  if (existing) {
    // Deliberately not the whole row: the body is fetched with an explicit
    // GET ?include=body, so a rejected write never becomes a side channel that
    // dumps a note the caller was not allowed to touch.
    const summary = { slug: existing.slug, source: existing.source, contentSha: shaOf(existing.bodyMd) };

    if (input.createOnly) {
      return { ok: false, conflict: "exists", existing: summary };
    }
    if (input.expectedSha !== undefined) {
      // Compare against the CURRENT body, not the stored content_sha — that
      // column tracks the seed file, and an app edit deliberately leaves it be.
      if (shaOf(existing.bodyMd) !== input.expectedSha) {
        return { ok: false, conflict: "sha_mismatch", existing: summary };
      }
    } else if (existing.source === "manual") {
      return { ok: false, conflict: "manual_authored", existing: summary };
    }
  }

  // Slug is unique. A different note may already hold the one this path derives,
  // so disambiguate rather than fail — the caller asked to store a note.
  let slug = baseSlug;
  for (let n = 2; n < 50; n += 1) {
    const clash = await db
      .select({ id: brainDocuments.id })
      .from(brainDocuments)
      .where(and(eq(brainDocuments.slug, slug), ne(brainDocuments.path, input.path)))
      .limit(1);
    if (clash.length === 0) break;
    slug = `${baseSlug}-${n}`;
  }

  const values = {
    path: input.path,
    slug,
    title,
    kind,
    folder,
    noteDate,
    bodyMd: input.bodyMd,
    frontmatter: input.frontmatter ?? {},
    contentSha,
    searchText: buildSearchText(title, input.bodyMd),
    source: input.source ?? "agent",
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(brainDocuments)
    .values({ ...values, companyId: input.companyId ?? null })
    .onConflictDoUpdate({
      target: brainDocuments.path,
      // company_id is absent on purpose: it is curated, and a re-run of an agent
      // must not unlink a note somebody attached to an account by hand.
      set: values,
    })
    .returning({ id: brainDocuments.id, slug: brainDocuments.slug, path: brainDocuments.path });

  // The body IS the graph. Skipping this is what made authored notes' links all
  // render dangling the first time around.
  await rebuildDocumentLinks(db, row.id, input.bodyMd);
  await resolveDanglingLinksTo(db, { id: row.id, title, slug: row.slug, path: row.path });

  return { ok: true, created: !existing, id: row.id, slug: row.slug, path: row.path, contentSha };
}

/** Case-insensitive path lookup helper for the API's existence checks. */
export function pathOrSlugFilter(value: string) {
  return or(eq(brainDocuments.path, value), eq(brainDocuments.slug, value));
}
