"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/lib/db";
import { getInternalPin, grantProposalAccess } from "@/lib/proposal/pin";
import { proposals } from "@/lib/schema";

const pinSchema = z.object({
  slug: z.string().trim().min(1),
  pin: z.string().trim().min(1),
});

// Server-side PIN check for public proposal pages. Successful entry issues a
// slug-scoped cookie and records the first view (sent -> viewed).
export async function verifyProposalPin(formData: FormData) {
  const parsed = pinSchema.parse({
    slug: formData.get("slug"),
    pin: formData.get("pin"),
  });

  const db = getDb();
  if (!db) {
    throw new Error("Database not configured.");
  }

  const [proposal] = await db
    .select({
      id: proposals.id,
      pin: proposals.pin,
      status: proposals.status,
      firstViewedAt: proposals.firstViewedAt,
    })
    .from(proposals)
    .where(eq(proposals.slug, parsed.slug))
    .limit(1);

  if (!proposal || (parsed.pin !== proposal.pin && parsed.pin !== getInternalPin())) {
    redirect(`/p/${parsed.slug}?e=1`);
  }

  await grantProposalAccess(parsed.slug);

  // Only client-PIN entries count as a client view; the internal master PIN
  // is for team previews and shouldn't flip tracking state.
  if (parsed.pin === proposal.pin) {
    await db
      .update(proposals)
      .set({
        firstViewedAt: proposal.firstViewedAt ?? new Date(),
        status: proposal.status === "sent" ? "viewed" : proposal.status,
      })
      .where(eq(proposals.id, proposal.id));
  }

  redirect(`/p/${parsed.slug}`);
}
