import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { checkIngestAuth } from "@/lib/brain/api-auth";
import { shaOf, upsertBrainDocument } from "@/lib/brain/upsert";
import { getDb } from "@/lib/db";
import { agentRuns, brainDocuments } from "@/lib/schema";

export const dynamic = "force-dynamic";

// The agent write path for the brain (plan 007, phase 2).
//
// This exists because retiring the Obsidian vault takes away where the two
// scheduled ingest runs currently write. They are headless scripts, so auth is a
// bearer token rather than the session cookie.
//
//   GET  /api/brain/documents?folder=Projects
//   GET  /api/brain/documents?path=People/Austin.md&include=body
//   POST /api/brain/documents   { path, bodyMd, ... }
//
// GET exists because writing is not all the ingest does: it checks whether a
// People note exists before creating one, lists Projects/Clients/Companies to
// map a session to a note, and appends to an existing journal entry. Without
// reads, an agent would have to blind-write and would clobber hand-written notes.

const postSchema = z.object({
  // Vault-style path — "Code/2026-05-10 Code Weekly Digest.md". Everything else
  // (folder, kind, date, slug) is derived from it, so a note written by an agent
  // is indistinguishable from an imported one.
  path: z.string().trim().min(3).max(400),
  bodyMd: z.string().max(1_000_000),
  title: z.string().trim().min(1).max(300).optional(),
  frontmatter: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  companyId: z.number().int().positive().nullable().optional(),
  /** Refuse if the note already exists. For "ensure People/Austin.md exists". */
  createOnly: z.boolean().optional(),
  /** sha256 of the body the caller last read. Read-modify-write for appends. */
  expectedSha: z.string().length(64).optional(),
  /** Attributes the write to a run, for cost and audit. */
  agentRunId: z.number().int().positive().optional(),
});

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function GET(request: Request) {
  const failure = checkIngestAuth(request);
  if (failure) return json({ error: failure.message }, failure.status);

  const db = getDb();
  if (!db) return json({ error: "DATABASE_URL is not set." }, 503);

  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  const folder = url.searchParams.get("folder");
  const includeBody = url.searchParams.get("include") === "body";
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 200) || 200, 500);

  // Bodies are opt-in, never the default: listing a folder with bodies attached
  // would drag the whole corpus over the wire for what is usually an existence
  // check. Same rule as the list queries in src/lib/brain/queries.ts.
  const columns = {
    path: brainDocuments.path,
    slug: brainDocuments.slug,
    title: brainDocuments.title,
    kind: brainDocuments.kind,
    folder: brainDocuments.folder,
    noteDate: brainDocuments.noteDate,
    companyId: brainDocuments.companyId,
    source: brainDocuments.source,
    updatedAt: brainDocuments.updatedAt,
    ...(includeBody ? { bodyMd: brainDocuments.bodyMd } : {}),
  };

  if (path) {
    const [doc] = await db.select(columns).from(brainDocuments).where(eq(brainDocuments.path, path)).limit(1);
    if (!doc) return json({ exists: false, document: null }, 404);
    // The sha of the CURRENT body, which is what a caller must echo back as
    // `expectedSha` to edit a human-authored note.
    const sha = "bodyMd" in doc ? shaOf(doc.bodyMd as string) : undefined;
    return json({ exists: true, document: { ...doc, ...(sha ? { contentSha: sha } : {}) } });
  }

  const rows = await db
    .select(columns)
    .from(brainDocuments)
    .where(and(isNull(brainDocuments.archivedAt), folder ? eq(brainDocuments.folder, folder) : undefined))
    .orderBy(desc(brainDocuments.noteDate), asc(brainDocuments.title))
    .limit(limit);

  return json({ count: rows.length, documents: rows });
}

export async function POST(request: Request) {
  const failure = checkIngestAuth(request);
  if (failure) return json({ error: failure.message }, failure.status);

  const db = getDb();
  if (!db) return json({ error: "DATABASE_URL is not set." }, 503);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Body must be JSON." }, 400);
  }

  const parsed = postSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "Invalid payload.", issues: parsed.error.issues }, 400);
  }

  const input = parsed.data;
  if (!input.path.toLowerCase().endsWith(".md")) {
    return json({ error: "path must end in .md" }, 400);
  }
  if (input.path.includes("..") || input.path.startsWith("/") || input.path.includes("\\")) {
    // `path` is only ever a database key here, never touched to disk — but a
    // traversal-shaped value would still be wrong, and would look alarming in
    // a note list. Reject it at the door.
    return json({ error: "path must be a plain vault-relative path." }, 400);
  }

  const result = await upsertBrainDocument(db, {
    path: input.path,
    bodyMd: input.bodyMd,
    title: input.title,
    frontmatter: input.frontmatter,
    companyId: input.companyId,
    source: "agent",
    createOnly: input.createOnly,
    expectedSha: input.expectedSha,
  });

  if (!result.ok) {
    // 409, not 403: the request was allowed, the state of the note is what
    // refused it. The caller is told exactly how to proceed.
    return json(
      {
        error:
          result.conflict === "exists"
            ? "A note already exists at that path (createOnly was set)."
            : result.conflict === "sha_mismatch"
              ? "The note changed since you read it. Re-read and retry."
              : "That note was written by a person. Read it and resend with expectedSha to edit it.",
        conflict: result.conflict,
        existing: result.existing,
      },
      409,
    );
  }

  if (input.agentRunId) {
    // Best-effort attribution. A missing run must not fail a good write.
    await db
      .update(agentRuns)
      .set({ itemsProposed: sql`${agentRuns.itemsProposed} + 1` })
      .where(eq(agentRuns.id, input.agentRunId));
  }

  return json(
    {
      ok: true,
      created: result.created,
      id: result.id,
      slug: result.slug,
      path: result.path,
      contentSha: result.contentSha,
      url: `/brain/${result.slug}`,
    },
    result.created ? 201 : 200,
  );
}
