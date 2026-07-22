import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { proposals } from "@/lib/schema";

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

  const proposal = await db.query.proposals.findFirst({ where: eq(proposals.id, proposalId) });
  if (!proposal || !proposal.signedPdfBase64) {
    return NextResponse.json({ error: "No signed PDF stored" }, { status: 404 });
  }

  const pdfBytes = Buffer.from(proposal.signedPdfBase64, "base64");
  const filename = `${proposal.business || proposal.slug} — Signed Proposal.pdf`.replaceAll('"', "");

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
