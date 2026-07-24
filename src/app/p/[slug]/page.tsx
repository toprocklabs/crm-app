import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { verifyProposalPin } from "@/app/p/actions";
import { getDb } from "@/lib/db";
import { parseProposalMarkdown } from "@/lib/proposal/markdown";
import { hasProposalAccess } from "@/lib/proposal/pin";
import { proposals } from "@/lib/schema";
import { ProposalView } from "./proposal-view";
import "../proposal-public.css";

export const dynamic = "force-dynamic";

async function getProposal(slug: string) {
  const db = getDb();
  if (!db) {
    return null;
  }
  // Explicit column list — never pull the multi-MB signed PDF base64 here.
  const [proposal] = await db
    .select({
      id: proposals.id,
      slug: proposals.slug,
      status: proposals.status,
      clientName: proposals.clientName,
      business: proposals.business,
      proposalDate: proposals.proposalDate,
      contentMd: proposals.contentMd,
    })
    .from(proposals)
    .where(eq(proposals.slug, slug))
    .limit(1);
  return proposal ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const proposal = await getProposal(slug);
  return {
    title: proposal ? `Statement of Work — ${proposal.business}` : "Statement of Work",
    robots: { index: false, follow: false },
  };
}

function PinGate({ slug, showError }: { slug: string; showError: boolean }) {
  return (
    <div className="sow-body">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://api.fontshare.com/v2/css?f[]=neue-montreal@400,500&display=swap" rel="stylesheet" />
      <div id="pin-gate">
        <div className="pin-box">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pin-logo" src="/ToprockLogoBlack.png" alt="toprock labs" />
          <p className="pin-prompt">
            Enter your PIN to view your
            <br />
            Statement of Work.
          </p>
          <form action={verifyProposalPin}>
            <input type="hidden" name="slug" value={slug} />
            <input
              type="password"
              id="pin-input"
              name="pin"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              autoComplete="off"
              autoFocus
            />
            <button className="pin-submit" type="submit">
              View
            </button>
          </form>
          {showError ? <p className="pin-error">Incorrect PIN. Please try again.</p> : null}
        </div>
      </div>
    </div>
  );
}

export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const { slug } = await params;
  const proposal = await getProposal(slug);
  if (!proposal) {
    notFound();
  }

  const unlocked = await hasProposalAccess(slug);
  if (!unlocked) {
    const { e } = await searchParams;
    return <PinGate slug={slug} showError={e === "1"} />;
  }

  const parsed = parseProposalMarkdown(proposal.contentMd);

  return (
    <ProposalView
      slug={slug}
      clientName={proposal.clientName}
      business={proposal.business}
      date={proposal.proposalDate}
      overview={parsed.overview}
      pricingRows={parsed.pricingRows}
      included={parsed.included}
      notesLines={parsed.notesLines}
      alreadySigned={proposal.status === "signed"}
    />
  );
}
