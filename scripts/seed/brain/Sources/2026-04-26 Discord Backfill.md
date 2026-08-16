# 2026-04-26 Discord Backfill

## Summary
The local Discord MCP server is working and read access succeeded through the `Codex MCP` bot. The backfill reviewed the five allowed channels visible to the bot and captured useful project context from April 9 through April 25, 2026 local Mountain time.

## Channels Reviewed
- `general` (`1489456298301980704`) - 100 recent messages fetched.
- `coatary` (`1495232333081608213`) - 23 messages fetched.
- `sport-recruiting` (`1496356431333556264`) - 2 messages fetched.
- `thescubadive` (`1492696125084405790`) - 3 messages fetched.
- `vital-alignments` (`1495983064231317664`) - 0 messages fetched.

## Highlights

### Coatary
**Channels:** `coatary`, `general`  
**Key dates:** April 18-25, 2026

Discord adds a more technical view of Coatary delivery. On April 18, Coatary logo assets were shared as `coatary_logos_png.zip`. Packaging discussion included whether the retainer belongs in the service packaging; Austin clarified that hosting is included in the file, while more consultative AI work should be quoted case by case.

On April 21, DNS/Vercel records were discussed for the live site: apex should point to Vercel and `www` should use Vercel DNS/CNAME guidance. On April 25, Austin built a preview that merges Flint's Coaty agent with the Coatary website. The preview initially opened to Vercel or was gated; Austin turned off the preview gate, and Justin confirmed the link worked. The chat itself did not work because Austin did not have Flint's Claude API token.

**Open items**
- [ ] Get Flint's Claude API token or decide on Toprock-owned runtime credentials for the Coatary agent.
- [ ] Decide how agent credentials should be handled before showing the integrated preview to Flint.
- [ ] Confirm whether case-by-case AI consulting work is separate from hosting/maintenance.
- [ ] Keep DNS/Vercel setup notes with the Coatary website project.

### The Scuba Dive Riverton / Pacific Scuba Repair
**Channels:** `general`, `thescubadive`  
**Key dates:** April 10-13, 2026

Discord confirms that Toprock treated the first Scuba meeting as a scoping conversation with rough pricing, not a fixed final quote. A Scuba Riverton proposal and Pacific Scuba Repair mockups were prepared around April 11. The Scuba Dive channel also captured Lightspeed Retail API links for customer endpoints and authentication, which matter for the course/onboarding automation path.

**Open items**
- [ ] Use Lightspeed Retail API customer/authentication docs when scoping The Scuba Dive workflow automation.
- [ ] Keep proposal pricing flexible until the workflow is fully scoped.
- [ ] Confirm whether Pacific Scuba Repair mockups are part of the same sale or a separate scope.

### Sport Recruiting Platform
**Channels:** `general`, `sport-recruiting`  
**Key dates:** April 10-22, 2026

The Travis / sport recruiting site gained a schedule feature with season/spring ball handling, database-backed schedules, and a per-season admin editor. A later branch supports multiple schools, with outstanding work to scrape Springville and Maple Mountain, think through per-school customization, verify the admin with new user auth, and create a coach registration process.

**Open items**
- [ ] Scrape Springville and Maple Mountain.
- [ ] Design architecture for light per-school customization.
- [ ] Verify admin works with new user auth.
- [ ] Define coach registration flow.

### Toprock CRM / Internal Operations
**Channel:** `general`  
**Key date:** April 11, 2026

Austin requested that the CRM track MRR at the account level and track both one-time implementation cost and MRR on opportunities. This is an internal operating-metrics decision: Toprock should measure recurring revenue, not just ARR or one-time project value.

**Open items**
- [ ] Add account-level MRR to CRM.
- [ ] Add opportunity-level one-time implementation cost and MRR.
- [ ] Use these fields when summarizing pipeline health.

### EPOXY LLC
**Channel:** `general`  
**Key date:** April 25, 2026

Austin shared an EPOXY LLC mock website. Justin responded positively. This looks like an early mockup/prospect or design experiment; no client commitment was visible in the reviewed messages.

**Open items**
- [ ] Clarify whether EPOXY LLC is a real prospect, Coatary-adjacent mockup, or internal demo.

### Toprock Site / Brand Assets
**Channel:** `general`  
**Key dates:** April 9-12, 2026

Discord captured Toprock logo/proposal-site deployment work, including a main Toprock site logo update, proposal redeploys, logo readability fixes, and asset handoff through Discord attachments.

**Open items**
- [ ] Keep Toprock brand assets organized outside Discord attachments.
- [ ] Confirm proposal/main-site deploy workflow is documented.

## Gaps
- Only the latest 100 messages from `general` were fetched, so older Discord history was not exhaustively reviewed.
- The `vital-alignments` channel had no readable messages.
- Attachment contents were not downloaded or inspected; only filenames, message context, and Discord links were reviewed.

## External Write Safety
- No Discord messages were posted, edited, deleted, or reacted to.
- The MCP server was used only for channel listing and message reads.
