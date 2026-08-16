import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { Db } from "@/lib/define-action";
import { brainDocumentLinks, brainDocuments, companies } from "@/lib/schema";

// Every read of the brain goes through here (plan 007).
//
// The rule that governs this file: `body_md` is selected in exactly one place,
// `getBrainDocument`. Bodies average 2.2KB and the largest is 12.4KB, so an
// unguarded list query drags ~150KB today and more every week the digests run.
// Same lesson as meetings.body_md in plan 006 and proposal_documents in 002.

/** Column list for every list view. Deliberately excludes `bodyMd`. */
const listColumns = {
  id: brainDocuments.id,
  slug: brainDocuments.slug,
  path: brainDocuments.path,
  title: brainDocuments.title,
  kind: brainDocuments.kind,
  folder: brainDocuments.folder,
  noteDate: brainDocuments.noteDate,
  companyId: brainDocuments.companyId,
  source: brainDocuments.source,
  updatedAt: brainDocuments.updatedAt,
};

const live = isNull(brainDocuments.archivedAt);

/**
 * Full-text search over the whole brain.
 *
 * `plainto_tsquery` rather than `to_tsquery` on purpose: it takes whatever the
 * user typed and can't be made to throw on stray punctuation or an unbalanced
 * quote. An empty query lists the newest notes instead of matching nothing,
 * which is what "opening the search page" should do.
 */
export async function searchBrain(db: Db, query: string, limit = 50) {
  const trimmed = query.trim();

  if (!trimmed) {
    return db
      .select({ ...listColumns, rank: sql<number>`0` })
      .from(brainDocuments)
      .where(live)
      .orderBy(desc(brainDocuments.noteDate), desc(brainDocuments.updatedAt))
      .limit(limit);
  }

  const tsquery = sql`plainto_tsquery('english', ${trimmed})`;
  const tsvector = sql`to_tsvector('english', ${brainDocuments.searchText})`;

  return db
    .select({ ...listColumns, rank: sql<number>`ts_rank(${tsvector}, ${tsquery})` })
    .from(brainDocuments)
    .where(and(live, sql`${tsvector} @@ ${tsquery}`))
    .orderBy(desc(sql`ts_rank(${tsvector}, ${tsquery})`), desc(brainDocuments.noteDate))
    .limit(limit);
}

/** Folder counts for the browse rail. */
export async function listBrainFolders(db: Db) {
  return db
    .select({
      folder: brainDocuments.folder,
      kind: brainDocuments.kind,
      count: sql<number>`count(*)::int`,
    })
    .from(brainDocuments)
    .where(live)
    .groupBy(brainDocuments.folder, brainDocuments.kind)
    .orderBy(asc(brainDocuments.folder));
}

export async function listBrainFolder(db: Db, folder: string, limit = 200) {
  return db
    .select(listColumns)
    .from(brainDocuments)
    .where(and(live, eq(brainDocuments.folder, folder)))
    .orderBy(desc(brainDocuments.noteDate), asc(brainDocuments.title))
    .limit(limit);
}

/** Notes attached to an account — the account-page panel. */
export async function listAccountBrainDocuments(db: Db, companyId: number) {
  return db
    .select(listColumns)
    .from(brainDocuments)
    .where(and(live, eq(brainDocuments.companyId, companyId)))
    .orderBy(desc(brainDocuments.noteDate), asc(brainDocuments.title));
}

/** The one query that reads a body. */
export async function getBrainDocument(db: Db, slug: string) {
  const rows = await db
    .select({
      ...listColumns,
      bodyMd: brainDocuments.bodyMd,
      frontmatter: brainDocuments.frontmatter,
      contactId: brainDocuments.contactId,
      archivedAt: brainDocuments.archivedAt,
      createdAt: brainDocuments.createdAt,
      companyName: companies.name,
    })
    .from(brainDocuments)
    .leftJoin(companies, eq(companies.id, brainDocuments.companyId))
    .where(eq(brainDocuments.slug, slug))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Outbound links, so the renderer can turn [[targets]] into hrefs.
 *
 * Returned as raw_target → slug. A dangling link (no note with that title yet)
 * is absent from the map, and the renderer marks it up as unresolved rather
 * than linking to nowhere.
 */
export async function outboundLinkTargets(db: Db, docId: number) {
  const target = alias(brainDocuments, "target");

  const rows = await db
    .select({ rawTarget: brainDocumentLinks.rawTarget, slug: target.slug })
    .from(brainDocumentLinks)
    .leftJoin(target, eq(target.id, brainDocumentLinks.targetDocId))
    .where(eq(brainDocumentLinks.sourceDocId, docId));

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.slug) map.set(row.rawTarget.toLowerCase(), row.slug);
  }
  return map;
}

/** What points at this note — the half of the graph the note itself can't see. */
export async function listBacklinks(db: Db, docId: number) {
  const source = alias(brainDocuments, "source_doc");

  return db
    .selectDistinctOn([source.id], {
      id: source.id,
      slug: source.slug,
      title: source.title,
      kind: source.kind,
      folder: source.folder,
      noteDate: source.noteDate,
    })
    .from(brainDocumentLinks)
    .innerJoin(source, eq(source.id, brainDocumentLinks.sourceDocId))
    .where(and(eq(brainDocumentLinks.targetDocId, docId), isNull(source.archivedAt)))
    .orderBy(asc(source.id));
}

/** Counts for the page header. */
export async function brainStats(db: Db) {
  const [row] = await db
    .select({
      documents: sql<number>`count(*)::int`,
      linked: sql<number>`count(*) filter (where ${brainDocuments.companyId} is not null)::int`,
      entities: sql<number>`count(*) filter (where ${brainDocuments.kind} = 'entity')::int`,
    })
    .from(brainDocuments)
    .where(live);

  return row ?? { documents: 0, linked: 0, entities: 0 };
}
