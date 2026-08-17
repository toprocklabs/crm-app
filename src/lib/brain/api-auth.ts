import { createHash, timingSafeEqual } from "node:crypto";

// Auth for the agent ingest API (plan 007, phase 2).
//
// A shared bearer token, NOT the `toprock_session` JWT cookie: both callers are
// headless scheduled scripts (Task Scheduler on Windows, a Codex cron) with no
// browser and nowhere to hold a login. Plan 008's MCP server puts OAuth in front
// of the same handlers for interactive agents.

export type AuthFailure = { status: 401 | 503; message: string };

/**
 * Returns null when the request is authorised, or the failure to return.
 *
 * A missing `BRAIN_INGEST_TOKEN` is a 503, not a 401: the endpoint is
 * misconfigured rather than the caller being wrong, and answering 401 would send
 * whoever is debugging it hunting for a bad token that was never the problem.
 */
export function checkIngestAuth(request: Request): AuthFailure | null {
  const expected = process.env.BRAIN_INGEST_TOKEN;

  if (!expected || expected.length < 16) {
    return { status: 503, message: "BRAIN_INGEST_TOKEN is not configured on the server." };
  }

  const header = request.headers.get("authorization") ?? "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!supplied) {
    return { status: 401, message: "Missing bearer token." };
  }

  // Compare fixed-width digests rather than the raw strings: timingSafeEqual
  // throws on length mismatch, and short-circuiting on length would leak how
  // long the real token is.
  const a = createHash("sha256").update(supplied).digest();
  const b = createHash("sha256").update(expected).digest();

  return timingSafeEqual(a, b) ? null : { status: 401, message: "Invalid bearer token." };
}
