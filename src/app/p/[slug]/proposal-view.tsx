"use client";

// Client-facing Statement of Work — ported from
// proposal_creator/templates/proposal.html.j2. Markup, styling, and the
// sign-and-send flow are preserved; the Apps Script webhook + EmailJS pair is
// replaced by a POST to /p/[slug]/sign, which stores the signed PDF on the
// proposal record and handles notifications server-side.
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PricingRow } from "@/lib/proposal/markdown";

type SignaturePadInstance = {
  clear: () => void;
  isEmpty: () => boolean;
  toDataURL: () => string;
  toData: () => unknown[];
  fromData: (data: unknown[]) => void;
};

type Html2CanvasFn = (element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>;

type JsPdfInstance = {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
  addPage: () => void;
  addImage: (data: string, type: string, x: number, y: number, w: number, h: number) => void;
  setFillColor: (r: number, g: number, b: number) => void;
  rect: (x: number, y: number, w: number, h: number, style: string) => void;
  output: (type: string) => string;
};

type ProposalWindow = Window & {
  SignaturePad?: new (canvas: HTMLCanvasElement, options: Record<string, unknown>) => SignaturePadInstance;
  html2canvas?: Html2CanvasFn;
  jspdf?: { jsPDF: new (options: Record<string, unknown>) => JsPdfInstance };
};

export function ProposalView({
  slug,
  clientName,
  business,
  date,
  overview,
  pricingRows,
  included,
  notesLines,
  alreadySigned,
}: {
  slug: string;
  clientName: string;
  business: string;
  date: string;
  overview: string;
  pricingRows: PricingRow[];
  included: string[];
  notesLines: string[];
  alreadySigned: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePadInstance | null>(null);
  const [tab, setTab] = useState<"draw" | "type">("draw");
  const [typedSig, setTypedSig] = useState("");
  const [printedName, setPrintedName] = useState("");
  const [email, setEmail] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [statusError, setStatusError] = useState(false);
  const [phase, setPhase] = useState<"form" | "sending" | "done">(alreadySigned ? "done" : "form");
  const [stamp, setStamp] = useState<{ image: string | null; typed: string | null; meta: string } | null>(null);

  const initPad = useCallback(() => {
    const win = window as ProposalWindow;
    const canvas = canvasRef.current;
    if (!win.SignaturePad || !canvas || !canvas.parentElement) {
      return;
    }
    canvas.width = canvas.parentElement.offsetWidth;
    canvas.height = 140;
    const previous = padRef.current?.toData();
    padRef.current = new win.SignaturePad(canvas, { penColor: "#0f0f0f" });
    if (previous && previous.length) {
      padRef.current.fromData(previous);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", initPad);
    return () => window.removeEventListener("resize", initPad);
  }, [initPad]);

  const setStatus = (msg: string, isError = false) => {
    setStatusMsg(msg);
    setStatusError(isError);
  };

  const getSig = () => {
    if (tab === "draw") {
      return padRef.current && !padRef.current.isEmpty() ? padRef.current.toDataURL() : null;
    }
    return typedSig.trim() || null;
  };

  const buildPdf = async () => {
    const win = window as ProposalWindow;
    const content = document.getElementById("proposal-content");
    if (!win.html2canvas || !win.jspdf || !content) {
      throw new Error("PDF libraries not loaded yet.");
    }

    const snap = await win.html2canvas(content, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#f5f2ee",
      logging: false,
    });

    const pdf = new win.jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const padT = 10;
    const padB = 10;
    const printH = pageH - padT - padB;
    const imgW = pageW;
    const imgH = (snap.height / snap.width) * imgW;
    // JPEG instead of the legacy PNG: ~10x smaller signed PDFs (the old flow
    // produced 11-24MB files), which also keeps the upload under serverless
    // request-body limits.
    const img = snap.toDataURL("image/jpeg", 0.92);
    const totalPages = Math.ceil(imgH / printH);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) {
        pdf.addPage();
      }
      pdf.addImage(img, "JPEG", 0, padT - page * printH, imgW, imgH);
      pdf.setFillColor(245, 242, 238);
      pdf.rect(0, 0, pageW, padT, "F");
      pdf.rect(0, pageH - padB, pageW, padB, "F");
    }

    return pdf;
  };

  const signAndSend = async () => {
    const sig = getSig();
    const name = printedName.trim();
    const emailValue = email.trim();

    if (!sig) return setStatus("Please provide a signature.", true);
    if (!name) return setStatus("Please enter your printed name.", true);
    if (!emailValue) return setStatus("Please enter your email address.", true);
    if (!agreed) return setStatus("Please check the agreement box to proceed.", true);

    setPhase("sending");
    setStatus("Preparing your signed proposal…");

    const signedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    setStamp({
      image: tab === "draw" ? sig : null,
      typed: tab === "type" ? sig : null,
      meta: `${name} — Signed ${signedDate}`,
    });

    try {
      // Let React paint the signature stamp before html2canvas snapshots it.
      await new Promise((resolve) => setTimeout(resolve, 80));

      setStatus("Generating PDF…");
      const pdf = await buildPdf();
      const pdfBase64 = pdf.output("datauristring").split(",")[1];

      setStatus("Saving signed proposal…");
      const res = await fetch(`/p/${slug}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdfBase64,
          name,
          email: emailValue,
          signedDate,
        }),
      });

      if (!res.ok) {
        throw new Error(`Sign endpoint responded ${res.status}`);
      }

      setStamp(null);
      setPhase("done");
      setStatus("");
    } catch (err) {
      console.error("signAndSend error:", err);
      setStamp(null);
      setPhase("form");
      setStatus("Something went wrong. Please try again or email us at info@toprocklabs.com.", true);
    }
  };

  return (
    <div className="sow-body">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet" />
      <link href="https://api.fontshare.com/v2/css?f[]=neue-montreal@400,500&display=swap" rel="stylesheet" />
      <Script src="https://cdn.jsdelivr.net/npm/signature_pad@4.1.7/dist/signature_pad.umd.min.js" strategy="afterInteractive" onLoad={initPad} />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" strategy="afterInteractive" />

      <div id="proposal-content">
        <header className="proposal-header">
          <div className="proposal-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="logo-img" src="/ToprockLogoBlack.png" alt="toprock labs" />
          </div>
          <div className="proposal-client">
            <span className="client-name">{clientName}</span>
            <span className="client-business">{business}</span>
            <span className="proposal-date">Statement of Work — {date}</span>
          </div>
        </header>

        <hr className="hrule" />

        <div className="section-heading">Project Overview</div>
        <div className="overview">
          <p>{overview}</p>
        </div>

        <div className="section-heading">Scope &amp; Pricing</div>
        <div className="table-wrap">
          <table className="pricing-table">
            <thead>
              <tr>
                <th className="col-item">Phase / Item</th>
                <th className="col-desc">Description</th>
                <th className="col-cost">Cost</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let dataRow = 0;
                return pricingRows.map((row, i) => {
                  const isLabel = !row.description && !row.cost;
                  const isTotal = row.item.toLowerCase().startsWith("total");
                  if (isLabel) {
                    return (
                      <tr className="row-label" key={i}>
                        <td colSpan={3}>{row.item}</td>
                      </tr>
                    );
                  }
                  if (isTotal) {
                    return (
                      <tr className="row-total" key={i}>
                        <td className="col-item">{row.item}</td>
                        <td className="col-desc">{row.description}</td>
                        <td className="col-cost">{row.cost}</td>
                      </tr>
                    );
                  }
                  dataRow += 1;
                  return (
                    <tr className={dataRow % 2 === 0 ? "row-even" : "row-odd"} key={i}>
                      <td className="col-item">{row.item}</td>
                      <td className="col-desc">{row.description}</td>
                      <td className="col-cost">{row.cost}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        <div className="section-heading">What&#8217;s Included</div>
        <ul className="included-list">
          {included.map((item, i) => (
            <li key={i}>
              <span className="bullet-mark">&#8212;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {notesLines.length ? (
          <>
            <hr className="hrule-accent" />
            {notesLines.map((line, i) => (
              <span className="notes-line" key={i}>
                {line}
              </span>
            ))}
          </>
        ) : null}

        <div className="signature-section" id="sig-section">
          <div className="sig-heading">Sign &amp; Accept</div>

          {stamp ? (
            <div className="sig-stamp" id="sig-stamp">
              <div className="sig-stamp-label">Signature</div>
              {stamp.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="sig-stamp-img" src={stamp.image} alt="Signature" />
              ) : null}
              {stamp.typed ? <div className="sig-stamp-typed">{stamp.typed}</div> : null}
              <div className="sig-stamp-meta">{stamp.meta}</div>
            </div>
          ) : null}

          {phase === "done" ? (
            <div className="confirmation-msg" id="confirmation-msg">
              {alreadySigned
                ? "This Statement of Work has been signed. Questions? Reach out anytime — info@toprocklabs.com."
                : "We’ve received your signed Statement of Work. We’ll be in touch shortly."}
            </div>
          ) : (
            <div id="sig-form" style={{ display: stamp ? "none" : "block" }}>
              <div className="sig-tabs">
                <button
                  type="button"
                  className={`sig-tab${tab === "draw" ? " active" : ""}`}
                  onClick={() => setTab("draw")}
                >
                  Draw
                </button>
                <button
                  type="button"
                  className={`sig-tab${tab === "type" ? " active" : ""}`}
                  onClick={() => setTab("type")}
                >
                  Type
                </button>
              </div>

              <div className={`sig-tab-content${tab === "draw" ? " active" : ""}`} id="tab-draw">
                <div className="sig-canvas-wrap">
                  <canvas id="sig-canvas" ref={canvasRef} />
                  <button className="sig-clear" type="button" onClick={() => padRef.current?.clear()}>
                    Clear
                  </button>
                </div>
              </div>

              <div className={`sig-tab-content${tab === "type" ? " active" : ""}`} id="tab-type">
                <input
                  type="text"
                  id="sig-typed"
                  placeholder="Full name"
                  autoComplete="off"
                  spellCheck={false}
                  value={typedSig}
                  onChange={(e) => setTypedSig(e.target.value)}
                />
              </div>

              <div className="sig-fields">
                <div className="sig-field">
                  <label htmlFor="printed-name">Printed Name</label>
                  <input
                    type="text"
                    id="printed-name"
                    placeholder="Your full name"
                    value={printedName}
                    onChange={(e) => setPrintedName(e.target.value)}
                  />
                </div>
                <div className="sig-field">
                  <label htmlFor="client-email">Email</label>
                  <input
                    type="email"
                    id="client-email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <label className="sig-agreement">
                <input type="checkbox" id="agreement" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span>
                  I agree to the pricing outlined in this Statement of Work and the{" "}
                  <a href={`/p/${slug}/terms`} target="_blank">
                    Terms of Service
                  </a>
                  .
                </span>
              </label>

              <button className="sig-submit" id="sig-submit" type="button" onClick={signAndSend} disabled={phase === "sending"}>
                Sign &amp; Send
              </button>
              <div className={`sig-status${statusError ? " error" : ""}`} id="sig-status">
                {statusMsg}
              </div>
            </div>
          )}
        </div>

        <footer className="proposal-footer">
          <div className="footer-contact">Questions? Reach out anytime &#8212; info@toprocklabs.com</div>
          <div className="footer-brand">toprock labs &nbsp;|&nbsp; toprocklabs.com</div>
          <div className="footer-tagline">&#8220;We build for your business like it&#8217;s our own.&#8221;</div>
        </footer>
      </div>
    </div>
  );
}
