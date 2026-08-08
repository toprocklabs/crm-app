import { sql } from "drizzle-orm";

/**
 * "Does this proposal have a signed PDF?" as a SQL predicate, for list and
 * detail queries that need the flag but must never fetch the bytes.
 *
 * Checks the `proposal_documents` side table first and falls back to the legacy
 * `proposals.signed_pdf_base64` column, so rows written before the split still
 * report correctly. The fallback disappears when the column is dropped
 * (see planning/004-architecture-hardening, F04).
 *
 * Naming the legacy column inside an IS NOT NULL test does NOT transfer its
 * contents — it is evaluated server-side and only the boolean comes back.
 *
 * Identifiers are written out rather than interpolated from the Drizzle schema
 * objects ON PURPOSE. Interpolating a column into a `sql` template emits it
 * UNQUALIFIED — `${proposalDocuments.proposalId} = ${proposals.id}` renders as
 * `"proposal_id" = "id"`, and inside `SELECT 1 FROM "proposal_documents"` both
 * of those resolve against proposal_documents. The correlation silently
 * evaporates and the predicate is always false. Qualifying by hand is the fix;
 * the round-trip check in the F04 notes is what caught it.
 */
export const hasSignedPdfExpr = sql<boolean>`(
  "proposals"."signed_pdf_base64" IS NOT NULL
  OR EXISTS (
    SELECT 1 FROM "proposal_documents" AS "pd"
    WHERE "pd"."proposal_id" = "proposals"."id"
  )
)`;
