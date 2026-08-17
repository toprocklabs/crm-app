import { eq } from "drizzle-orm";
import { z } from "zod";
import { checkIngestAuth } from "@/lib/brain/api-auth";
import { getDb } from "@/lib/db";
import { agentRuns } from "@/lib/schema";

export const dynamic = "force-dynamic";

// Open and close an ingest run (plan 007, phase 2).
//
// `agent_runs` already existed for the standing loops; this just lets the two
// scheduled ingests use it. Without it an agent write is auditable only as
// `brain_documents.source = 'agent'`, which says a machine wrote it but not
// which run, when it started, or what it cost.
//
//   POST /api/brain/runs  { loop: "ingest_code_weekly", model: "claude-opus-5" }
//     → { id }
//   POST /api/brain/runs  { id, status: "ok", itemsSeen: 42, ... }
//     → closes it

const schema = z.object({
  /** Omit to open a new run; supply to update an existing one. */
  id: z.number().int().positive().optional(),
  loop: z.string().trim().min(2).max(64).optional(),
  model: z.string().trim().max(64).optional(),
  status: z.enum(["running", "ok", "error", "halted_budget"]).optional(),
  tokensIn: z.number().int().nonnegative().optional(),
  tokensOut: z.number().int().nonnegative().optional(),
  costCents: z.number().int().nonnegative().optional(),
  itemsSeen: z.number().int().nonnegative().optional(),
  itemsProposed: z.number().int().nonnegative().optional(),
  notes: z.string().max(4000).optional(),
});

export async function POST(request: Request) {
  const failure = checkIngestAuth(request);
  if (failure) return Response.json({ error: failure.message }, { status: failure.status });

  const db = getDb();
  if (!db) return Response.json({ error: "DATABASE_URL is not set." }, { status: 503 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Body must be JSON." }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return Response.json({ error: "Invalid payload.", issues: parsed.error.issues }, { status: 400 });
  }

  const { id, loop, ...rest } = parsed.data;

  if (!id) {
    if (!loop) return Response.json({ error: "loop is required to open a run." }, { status: 400 });
    const [row] = await db
      .insert(agentRuns)
      .values({ loop, status: "running", ...rest })
      .returning({ id: agentRuns.id });
    return Response.json({ ok: true, id: row.id }, { status: 201 });
  }

  // Only the fields actually supplied are written, so closing a run with just a
  // status can't zero the counters the document endpoint has been incrementing.
  const updates: Record<string, unknown> = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(updates).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  // Stamp the end when the run reaches a terminal state, so a run that dies
  // without reporting stays visibly unfinished rather than looking complete.
  if (rest.status && rest.status !== "running") {
    updates.finishedAt = new Date();
  }

  const [row] = await db
    .update(agentRuns)
    .set(updates)
    .where(eq(agentRuns.id, id))
    .returning({ id: agentRuns.id, status: agentRuns.status });

  if (!row) return Response.json({ error: `No run #${id}.` }, { status: 404 });
  return Response.json({ ok: true, ...row });
}
