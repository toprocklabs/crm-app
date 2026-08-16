import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { extractWikiLinks } from "@/lib/brain/frontmatter";
import type { Db } from "@/lib/define-action";
import { brainDocumentLinks, brainDocuments } from "@/lib/schema";

// Keeping the [[wiki-link]] graph correct for notes written in the app (plan 007).
//
// The importer builds this graph for the 69 notes it brings over. Without the
// same work here, a note authored in the CRM would render every one of its links
// as dangling — which is exactly what happened the first time a note was created
// through /brain/new. The graph has to be maintained by whoever writes the body,
// and after the vault is retired that is mostly this app.

// When two notes share a title the higher-priority folder wins. The vault
// genuinely duplicates five businesses across Clients/ and Companies/, so a bare
// [[Coatary]] is ambiguous. Mirrors FOLDER_PRIORITY in scripts/map-brain.mts.
const FOLDER_RANK = sql<number>`case ${brainDocuments.folder}
  when 'Companies' then 0
  when 'Clients'   then 1
  when 'People'    then 2
  when 'Projects'  then 3
  when 'Root'      then 4
  else 5 end`;

/**
 * Rebuild a note's outbound links from its body.
 *
 * Wholesale rather than incremental: an edit can add or remove a link and there
 * is no stable per-link identity to upsert against. Same call the importer makes.
 */
export async function rebuildDocumentLinks(db: Db, docId: number, bodyMd: string) {
  const targets = extractWikiLinks(bodyMd);

  await db.delete(brainDocumentLinks).where(eq(brainDocumentLinks.sourceDocId, docId));
  if (targets.length === 0) {
    return;
  }

  // One query for every target, then resolve in memory — a note has a handful of
  // links, and a round trip each would be the slow part of saving a note.
  const keys = targets.map((target) => target.toLowerCase());
  const candidates = await db
    .select({
      id: brainDocuments.id,
      title: brainDocuments.title,
      slug: brainDocuments.slug,
      path: brainDocuments.path,
      rank: FOLDER_RANK,
    })
    .from(brainDocuments)
    .where(
      and(
        isNull(brainDocuments.archivedAt),
        // `inArray`, not `= any(${keys})`: drizzle expands a JS array into
        // separate placeholders, which Postgres rejects as "op ANY/ALL (array)
        // requires array on right side".
        or(
          inArray(sql`lower(${brainDocuments.title})`, keys),
          inArray(sql`lower(${brainDocuments.slug})`, keys),
          inArray(sql`lower(${brainDocuments.path})`, keys),
        ),
      ),
    );

  const bestByKey = new Map<string, { id: number; rank: number }>();
  for (const row of candidates) {
    for (const key of [row.title.toLowerCase(), row.slug.toLowerCase(), row.path.toLowerCase()]) {
      const current = bestByKey.get(key);
      if (!current || row.rank < current.rank) bestByKey.set(key, { id: row.id, rank: row.rank });
    }
  }

  await db.insert(brainDocumentLinks).values(
    targets.map((rawTarget) => ({
      sourceDocId: docId,
      rawTarget,
      // Null stays meaningful: a link to a note nobody has written yet.
      targetDocId: bestByKey.get(rawTarget.toLowerCase())?.id ?? null,
    })),
  );
}

/**
 * Resolve links that were dangling because this note didn't exist yet.
 *
 * The other half of the contract: writing "[[Q3 pricing]]" in five notes before
 * the note exists should light all five up the moment it does, the way Obsidian's
 * graph did. Called on create, and on rename.
 */
export async function resolveDanglingLinksTo(
  db: Db,
  doc: { id: number; title: string; slug: string; path: string },
) {
  const keys = [doc.title.toLowerCase(), doc.slug.toLowerCase(), doc.path.toLowerCase()];

  await db
    .update(brainDocumentLinks)
    .set({ targetDocId: doc.id })
    .where(
      and(
        isNull(brainDocumentLinks.targetDocId),
        inArray(sql`lower(${brainDocumentLinks.rawTarget})`, keys),
      ),
    );
}

/** Slugs whose pages now show different links, so they can be revalidated. */
export async function slugsLinkingTo(db: Db, docId: number) {
  const rows = await db
    .select({ slug: brainDocuments.slug })
    .from(brainDocumentLinks)
    .innerJoin(brainDocuments, eq(brainDocuments.id, brainDocumentLinks.sourceDocId))
    .where(inArray(brainDocumentLinks.targetDocId, [docId]));

  return [...new Set(rows.map((row) => row.slug))];
}
