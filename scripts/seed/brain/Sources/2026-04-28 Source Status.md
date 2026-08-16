# 2026-04-28 Source Status

## Summary
Manual refresh completed with Granola, Gmail, Google Drive, and Discord coverage. Earlier same-day files were Discord-only; this refresh added Gmail/Drive/Granola data and wrote local Markdown updates in the vault. No external write actions were taken.

## Granola
- **Status:** Available.
- **Date window used:** `2026-04-28T00:00:00-06:00` to `2026-04-29T00:00:00-06:00`.
- **Tools used:** `list_meetings`, `query_granola_meetings`, `get_meetings`.
- **Meetings considered:** 2.
- **Toprock-relevant meetings:** 0.
- **Notes:** Both meetings were Lucid sales candidate interviews, not Toprock Labs work, so no Toprock meeting files were created.

## Gmail
- **Status:** Available.
- **Query used:** `after:2026/04/28 before:2026/04/29`.
- **Email results considered:** 14 message summaries.
- **Threads expanded:** 12 message IDs across the highest-signal Scuba, MHM, and Mercury/payment threads.
- **Highest-signal items captured:**
  - The Scuba Dive / Pacific Scuba recap email to Kate Larson and Preston, including Lightspeed integration, AI-look concern, differentiation concern, Pacific Scuba retainer removal, proposal links, deposit link, and Pacific Scuba domain-ownership blocker.
  - Mercury invoice `INV-4` paid by Kate Larson for `$250.00`, initial deposit for Phase 1.
  - Scuba Dive course/onboarding email templates for Scuba Discovery, Rescue, Nitrox, Refresher, Open Water, Advanced, Drysuit, FRTI CPR, and O2 Provider.
  - MHM software meeting confirmed for June 22, 2026 at 10:00 AM.
- **Low-signal / excluded:** Mercury developer-suite marketing email.

## Google Drive
- **Status:** Available.
- **Queries used:**
  - `modifiedTime >= '2026-04-28T00:00:00' and modifiedTime < '2026-04-29T00:00:00' and mimeType != 'application/vnd.google-apps.folder'`
  - Fallback keyword search: `Toprock`
- **Same-day files found:** 2.
- **Recent fallback files reviewed:** 8 results, including Toprock MSA/TOS, service packaging, proposal examples, NDA, signed proposal folder, and organization docs.
- **Documents captured in digest:** The Scuba Dive signed proposal PDF, Pacific Scuba Repair signed proposal PDF, Toprock MSA/TOS, Toprock service packaging, Surf n Sport Chiro proposal, Mutual NDA.
- **Gaps:** The signed proposal PDFs were visible and downloadable, but the Drive text extractor returned empty content because the PDFs appear image-based. Their metadata was recorded and interpreted alongside Gmail proposal/deposit context rather than quoting PDF body text.

## Discord
- **Status:** Available via local MCP output from the same scheduled run.
- **Tool:** `discord-second-brain-mcp` local STDIO server at `E:\Codex Projects\toprock_brain_scheduled_run_jt\discord-second-brain-mcp\dist\index.js`.
- **Date window used:** `2026-04-28T00:00:00-06:00` to `2026-04-29T00:00:00-06:00`.
- **Channels reviewed:** `general`, `coatary`, `sport-recruiting`, `thescubadive`, `vital-alignments`.
- **Messages fetched:** 134 total across channels.
- **Messages in-window:** 6.
- **Highest-signal items captured:**
  - South Pointe Dental: request for `southpointedds.com` mockup and Vercel preview link.
  - The Scuba Dive: original meeting transcript question, booking-flow wireframes link, and attached standalone HTML wireframe file.
- **Attachment readback:** Downloaded and unpacked `Booking_Flow_Wireframes__standalone_.html` locally. See [[2026-04-28 Discord Attachment - Scuba Booking Flow Wireframes]] for the extracted content summary.
- **Gaps:** No Discord write actions were taken. The attachment was downloaded from the CDN and read locally; it was not re-uploaded or modified in Discord.

## External Write Safety
- No emails were sent, forwarded, archived, labeled, deleted, or drafted.
- No Google Drive files were created, edited, moved, or deleted.
- No Discord messages were posted, edited, deleted, or reacted to.
- No Granola notes were created or modified.
- Only local Markdown files inside `E:\Toprock Labs\toprock_brain` were created or updated.
