import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { notifyProposalSigned } from "@/lib/proposal/notify";
import { hasProposalAccess } from "@/lib/proposal/pin";
import { activities, proposalDocuments, proposals } from "@/lib/schema";

export const dynamic = "force-dynamic";

// ~20MB of base64 ≈ 15MB PDF — far above anything the client generator emits.
const MAX_PDF_BASE64_LENGTH = 20 * 1024 * 1024;

const signSchema = z.object({
  pdfBase64: z.string().min(100).max(MAX_PDF_BASE64_LENGTH),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  signedDate: z.string().trim().max(60),
});

// Client signing endpoint (replaces the Apps Script webhook). Requires the
// slug-scoped PIN cookie, so only someone who entered the PIN can sign.
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!(await hasProposalAccess(slug))) {
    return NextResponse.json({ error: "PIN verification required" }, { status: 401 });
  }

  const db = getDb();
  if (!db) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const [proposal] = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      status: proposals.status,
      business: proposals.business,
      companyId: proposals.companyId,
      dealId: proposals.dealId,
      contactId: proposals.contactId,
      firstViewedAt: proposals.firstViewedAt,
    })
    .from(proposals)
    .where(eq(proposals.slug, slug))
    .limit(1);
  if (!proposal) {
    return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
  }

  if (proposal.status === "signed") {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }

  let parsed: z.infer<typeof signSchema>;
  try {
    parsed = signSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!/^[A-Za-z0-9+/=\r\n]+$/.test(parsed.pdfBase64)) {
    return NextResponse.json({ error: "Invalid PDF data" }, { status: 400 });
  }

  const signedAt = new Date();

  // Store the document BEFORE flipping status. There are no transactions on the
  // neon-http driver (see planning/004-architecture-hardening, F01), so ordering
  // is the only atomicity we have. This way a failure leaves an unreferenced
  // document row and an unsigned proposal the client can retry — rather than a
  // proposal marked "signed" with no PDF behind it, which is unrecoverable.
  // onConflictDoUpdate makes that retry idempotent against the unique index.
  await db
    .insert(proposalDocuments)
    .values({
      proposalId: proposal.id,
      pdfBase64: parsed.pdfBase64,
      byteLength: Buffer.byteLength(parsed.pdfBase64, "utf8"),
    })
    .onConflictDoUpdate({
      target: proposalDocuments.proposalId,
      set: {
        pdfBase64: parsed.pdfBase64,
        byteLength: Buffer.byteLength(parsed.pdfBase64, "utf8"),
        createdAt: signedAt,
      },
    });

  await db
    .update(proposals)
    .set({
      status: "signed",
      signerName: parsed.name,
      signerEmail: parsed.email,
      signedAt,
      firstViewedAt: proposal.firstViewedAt ?? signedAt,
      updatedAt: signedAt,
    })
    .where(eq(proposals.id, proposal.id));

  await db.insert(activities).values({
    type: "note",
    notes: `Signed proposal "${proposal.title}" — ${parsed.name} (${parsed.email}) signed on ${parsed.signedDate || signedAt.toLocaleDateString("en-US")}. Signed PDF stored on the proposal record.`,
    companyId: proposal.companyId,
    contactId: proposal.contactId,
    dealId: proposal.dealId,
    source: "manual",
    occurredAt: signedAt,
  });

  await notifyProposalSigned({
    business: proposal.business,
    clientName: parsed.name,
    clientEmail: parsed.email,
    signedDate: parsed.signedDate || signedAt.toLocaleDateString("en-US"),
    pdfBase64: parsed.pdfBase64,
  });

  revalidatePath("/proposals");
  revalidatePath(`/proposals/${proposal.id}`);
  revalidatePath(`/accounts/${proposal.companyId}`);
  if (proposal.dealId) {
    revalidatePath(`/opportunities/${proposal.dealId}`);
  }

  return NextResponse.json({ ok: true });
}
