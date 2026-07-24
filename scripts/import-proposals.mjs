// Backfill: import legacy proposals from the proposal_creator repo into the
// CRM's `proposals` table, matched (or created) against `companies`.
//
// Usage:
//   node scripts/import-proposals.mjs [--dry-run] [--source <path>] [--pdf-dir <path>]
//
//   --source   proposal_creator checkout (default: ../proposal_creator)
//   --pdf-dir  directory of signed PDFs named <slug>.pdf (e.g. downloaded from
//              the "Signed Proposals — toprock labs" Drive folder). Proposals
//              with a matching PDF are imported as `signed`; the rest as `sent`.
//   --dry-run  print what would happen without writing.
//
// Idempotent: proposals are upserted by slug; companies are matched
// case-insensitively by business name before being created.
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";

config({ path: ".env.local" });
config();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const sourceDir = resolve(args.includes("--source") ? args[args.indexOf("--source") + 1] : "../proposal_creator");
const pdfDir = args.includes("--pdf-dir") ? resolve(args[args.indexOf("--pdf-dir") + 1]) : null;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local.");
  process.exit(1);
}

const proposalsDir = join(sourceDir, "proposals");
if (!existsSync(proposalsDir)) {
  console.error(`No proposals directory at ${proposalsDir}. Pass --source <proposal_creator path>.`);
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// Legacy proposal `business` names that differ from the CRM account name.
const BUSINESS_ALIASES = {
  "The Scuba Dive": "Scuba Dive Utah", // scubadiveriverton.com — account #1
};

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) {
    return { metadata: {}, content: raw };
  }
  const parts = raw.split("---");
  if (parts.length < 3) {
    return { metadata: {}, content: raw };
  }
  const metadata = {};
  for (const line of parts[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#") || !line.includes(":")) continue;
    const idx = line.indexOf(":");
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    // Strip trailing "# comment" and surrounding quotes (matches the Python loader).
    value = value.replace(/\s+#.*$/, "").replace(/^["']|["']$/g, "");
    metadata[key] = value;
  }
  return { metadata, content: parts.slice(2).join("---").replace(/^\s+/, "") };
}

const slugs = readdirSync(proposalsDir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(proposalsDir, d.name, "proposal.md")))
  .map((d) => d.name);

console.log(`Found ${slugs.length} legacy proposals in ${proposalsDir}${dryRun ? " (dry run)" : ""}`);

for (const slug of slugs) {
  const raw = readFileSync(join(proposalsDir, slug, "proposal.md"), "utf8");
  const { metadata, content } = parseFrontmatter(raw);

  const business = metadata.business || slug.replaceAll("_", " ");
  const clientName = metadata.client_name || "";
  const proposalDate = metadata.date || "";
  const pin = String(metadata.pin || "9198");
  const title = `${business} — Statement of Work`;

  // Signed PDF, if provided.
  let signedPdfBase64 = null;
  if (pdfDir) {
    const pdfPath = join(pdfDir, `${slug}.pdf`);
    if (existsSync(pdfPath)) {
      signedPdfBase64 = readFileSync(pdfPath).toString("base64");
    }
  }
  const status = signedPdfBase64 ? "signed" : "sent";

  // Match the account case-insensitively; create it if missing — `customer`
  // when we hold a signed agreement, otherwise `in_pipeline`.
  const accountName = BUSINESS_ALIASES[business] ?? business;
  const matches = await sql`select id, name from companies where lower(name) = lower(${accountName}) limit 1`;
  let companyId;
  let companyNote;
  if (matches.length) {
    companyId = matches[0].id;
    companyNote = `matched account #${companyId} "${matches[0].name}"`;
  } else if (dryRun) {
    companyNote = `would create account "${business}"`;
  } else {
    const created = await sql`
      insert into companies (name, stage) values (${accountName}, ${signedPdfBase64 ? "customer" : "in_pipeline"}) returning id
    `;
    companyId = created[0].id;
    companyNote = `created account #${companyId} "${business}"`;
  }

  console.log(`- ${slug}: ${companyNote}; status=${status}${signedPdfBase64 ? " (PDF attached)" : ""}`);
  if (dryRun) continue;

  const parsedDate = proposalDate ? new Date(proposalDate) : null;
  const timestamps = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;

  const upserted = await sql`
    insert into proposals (
      company_id, title, slug, pin, status, client_name, business, proposal_date,
      content_md, signed_pdf_base64, signer_name, signed_at, sent_at
    ) values (
      ${companyId}, ${title}, ${slug}, ${pin}, ${status}, ${clientName}, ${business}, ${proposalDate},
      ${content}, ${signedPdfBase64}, ${signedPdfBase64 ? clientName : null},
      ${signedPdfBase64 ? timestamps : null}, ${timestamps}
    )
    on conflict (slug) do update set
      company_id = excluded.company_id,
      title = excluded.title,
      pin = excluded.pin,
      client_name = excluded.client_name,
      business = excluded.business,
      proposal_date = excluded.proposal_date,
      content_md = excluded.content_md,
      signed_pdf_base64 = coalesce(excluded.signed_pdf_base64, proposals.signed_pdf_base64),
      status = case when proposals.status = 'signed' then proposals.status else excluded.status end,
      updated_at = now()
    returning id, status
  `;

  // Backdated activity for signed agreements (only on first import of the signature).
  if (signedPdfBase64) {
    const existingActivity = await sql`
      select id from activities where company_id = ${companyId} and notes like ${"Signed proposal \"" + title + "\"%"} limit 1
    `;
    if (!existingActivity.length) {
      await sql`
        insert into activities (type, notes, company_id, source, occurred_at)
        values (
          'note',
          ${`Signed proposal "${title}" — ${clientName || "client"} signed${proposalDate ? ` on ${proposalDate}` : ""}. Imported from proposal_creator.`},
          ${companyId}, 'manual', ${timestamps ?? new Date()}
        )
      `;
    }
  }

  console.log(`  -> proposal #${upserted[0].id} (${upserted[0].status})`);
}

console.log("Done.");
