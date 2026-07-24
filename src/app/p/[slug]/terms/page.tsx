import type { Metadata } from "next";
import { markdownToHtml } from "@/lib/proposal/markdown";
import { termsMarkdown } from "@/lib/proposal/terms-content";
import "../../proposal-public.css";

export const metadata: Metadata = {
  title: "Terms of Service — toprock labs",
  robots: { index: false, follow: false },
};

// Server-side port of the classification the old terms.html did in client JS:
// numbered sub-clauses get indented, ALL-CAPS legal blocks get the boxed style.
function classifyParagraphs(html: string) {
  return html.replace(/<p>([\s\S]*?)<\/p>/g, (match, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").trim();
    if (/^\d+\.\d+\s/.test(text)) {
      return `<p class="sub-clause">${inner}</p>`;
    }
    const letters = text.replace(/[^a-zA-Z]/g, "");
    const upper = text.replace(/[^A-Z]/g, "");
    if (letters.length > 40 && upper.length / letters.length > 0.6) {
      return `<p class="legal-caps">${inner}</p>`;
    }
    return match;
  });
}

export default function ProposalTermsPage() {
  const tosHtml = classifyParagraphs(markdownToHtml(termsMarkdown));

  return (
    <div className="tos-page">
      <link href="https://api.fontshare.com/v2/css?f[]=neue-montreal@400,500&display=swap" rel="stylesheet" />
      <div className="page">
        <header className="tos-header">
          <div className="logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-img" src="/ToprockLogoBlack.png" alt="toprock labs" />
          </div>
          <div className="tos-label">Terms of Service</div>
        </header>

        <hr className="hrule" />

        <div className="tos-body" dangerouslySetInnerHTML={{ __html: tosHtml }} />

        <footer className="tos-footer">
          <div className="footer-brand">toprock labs &nbsp;|&nbsp; toprocklabs.com</div>
          <div className="footer-tagline">&#8220;We build for your business like it&#8217;s our own.&#8221;</div>
        </footer>
      </div>
    </div>
  );
}
