import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { proposalDocuments, proposals } from "@/lib/schema";

export const dynamic = "force-dynamic";

// Authenticated download of the stored signed PDF.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const { id } = await params;
  const proposalId = Number(id);
  if (!Number.isInteger(proposalId) || proposalId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Explicit columns — never pull the legacy signed_pdf_base64 blob unless we
  // actually need it below.
  const proposal = await db.query.proposals.findFirst({
    columns: { id: true, slug: true, business: true, signedPdfBase64: true },
    where: eq(proposals.id, proposalId),
  });
  if (!proposal) {
    return NextResponse.json({ error: "No signed PDF stored" }, { status: 404 });
  }

  // The document now lives in its own table; fall back to the legacy column so
  // any row written before the split still downloads. The fallback goes away
  // with the column (see planning/004-architecture-hardening, F04).
  const document = await db.query.proposalDocuments.findFirst({
    columns: { pdfBase64: true },
    where: eq(proposalDocuments.proposalId, proposalId),
  });

  const base64 = document?.pdfBase64 ?? proposal.signedPdfBase64;
  if (!base64) {
    return NextResponse.json({ error: "No signed PDF stored" }, { status: 404 });
  }

  const pdfBytes = Buffer.from(base64, "base64");
  const filename = `${proposal.business || proposal.slug} — Signed Proposal.pdf`.replaceAll('"', "");

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
