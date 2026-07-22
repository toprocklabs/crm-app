// Notifications when a proposal is signed. Replaces the Apps Script webhook
// + EmailJS pair from proposal_creator. Provider is chosen by env:
//   RESEND_API_KEY               -> email via Resend (internal + client copies)
//   PROPOSAL_SIGNED_WEBHOOK_URL  -> POST the legacy Apps Script payload
//   neither                      -> skip silently (the PDF is already stored)
const INTERNAL_NOTIFY_EMAIL = process.env.PROPOSAL_NOTIFY_EMAIL ?? "info@toprocklabs.com";
const FROM_EMAIL = process.env.PROPOSAL_FROM_EMAIL ?? "toprock labs <info@toprocklabs.com>";

type SignedNotification = {
  business: string;
  clientName: string;
  clientEmail: string;
  signedDate: string;
  pdfBase64: string;
};

async function sendResendEmail(payload: {
  to: string[];
  subject: string;
  text: string;
  attachPdf?: { filename: string; base64: string };
}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      attachments: payload.attachPdf
        ? [{ filename: payload.attachPdf.filename, content: payload.attachPdf.base64 }]
        : undefined,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
  }
}

export async function notifyProposalSigned(input: SignedNotification) {
  try {
    if (process.env.RESEND_API_KEY) {
      const filename = `${input.business} — Signed Proposal — ${input.signedDate}.pdf`;
      await sendResendEmail({
        to: [INTERNAL_NOTIFY_EMAIL],
        subject: `Signed Proposal — ${input.business}`,
        text: `${input.clientName} (${input.clientEmail}) signed the ${input.business} proposal on ${input.signedDate}. The signed PDF is attached and stored in the CRM.`,
        attachPdf: { filename, base64: input.pdfBase64 },
      });
      if (input.clientEmail) {
        await sendResendEmail({
          to: [input.clientEmail],
          subject: "Your signed proposal — toprock labs",
          text: `Hi ${input.clientName},\n\nThanks for signing the ${input.business} Statement of Work on ${input.signedDate}. We've received it and will be in touch shortly.\n\n— toprock labs`,
        });
      }
      return;
    }

    if (process.env.PROPOSAL_SIGNED_WEBHOOK_URL) {
      // Legacy Apps Script payload shape (send_proposal.gs): saves to Drive
      // and emails both parties.
      await fetch(process.env.PROPOSAL_SIGNED_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          pdf_base64: input.pdfBase64,
          client_name: input.clientName,
          client_email: input.clientEmail,
          business: input.business,
          signed_date: input.signedDate,
        }),
      });
    }
  } catch (error) {
    // Notification failure must never lose a signature — the PDF is already
    // persisted before this runs. Log and move on.
    console.error("Proposal signed notification failed:", error);
  }
}
