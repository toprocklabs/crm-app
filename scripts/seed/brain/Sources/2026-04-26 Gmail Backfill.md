# 2026-04-26 Gmail Backfill

## Summary
Gmail connector access is now working for `justin@toprocklabs.com`. Date-bounded searches for April 25 and April 26 returned no messages, so this backfill searched recent business-relevant mail and captured the highest-signal threads from April 11 through April 22, 2026.

## Search Scope
- `after:2026/04/25 before:2026/04/26` - 0 messages.
- `after:2026/04/26 before:2026/04/27` - 0 messages.
- `newer_than:14d (toprock OR Coatary OR Peaceful OR Vercel OR proposal OR invoice OR client OR project OR meeting)` - 25 messages returned.
- `newer_than:14d -from:(toprocklabs.com)` - 19 messages returned.
- `newer_than:14d from:(toprocklabs.com)` - 10 messages returned.
- `newer_than:30d (Coatary OR Peaceful OR "Surf n Sport" OR chiro OR "Legal Software" OR proposal)` - 25 messages returned.

## Threads Reviewed

### Scuba Dive Riverton / Pacific Scuba Repair
**Thread:** Gmail `19d7dabfc7177806`  
**Date range:** April 11-22, 2026  
**People:** [[Kate Larson]], Austin Truong, Justin Truong, Preston, Alex Larson

Kate said the team is "definitely interested in moving forward" and asked to set up a Friday phone call to answer questions. Toprock had sent two proposal links: one for The Scuba Dive and one for Pacific Scuba Repair, both using PIN 9198.

**Business context**
- The Scuba Dive website concept combines adventure and community design direction.
- Phase 1 workflow automation centers on class signup and onboarding: RentItBiz emails, manual Google Calendar updates, Lightspeed e-learning codes, waivers, class details, and Gmail template emails.
- Pacific Scuba Repair is a high-priority website because Preston is pushing toward national advertising.
- Longer-term phase is replacing RentItBiz, starting after the scheduling/courses workflow is improved.

**Open items**
- [ ] Schedule / complete the Friday questions call with Kate, Preston, Alex, Justin, and Austin.
- [ ] Confirm proposal questions and whether The Scuba Dive and Pacific Scuba Repair scopes should close together or separately.
- [ ] Get Pacific Scuba Repair hosting and domain credentials.
- [ ] Get RentItBiz login access.

### Surf n Sport Chiro / Vital Alignments
**Thread:** Gmail `19d7f150dd2f0101`  
**Date range:** April 11-21, 2026  
**People:** [[Dr. Brandon Kanoa Imada]], Justin Truong, Austin Truong

Brandon paid the down payment, preferred mockup Concept 3, and shared brand/content materials. He clarified that Keep It Pono, LLC is the legal business and Surf N Sport Chiropractic is the DBA. He wants the new site to become a place for resources, newsletters, programs, videos, PDFs, and deeper client education.

**Business context**
- Proposal/down payment flow is active; the first payment was received via Mercury/Stripe.
- Toprock sent mockups, Round 2 updates, and a follow-up asking whether Brandon wants another call to confirm direction and pivots.
- Brandon referenced Mountain Edge Performance, Paul Chek, and Bob and Brad as inspiration for resource-rich content and program pages.
- Justin tested a ChatGPT-generated logo concept and sent it to Brandon as an exploratory visual.

**Open items**
- [ ] Confirm Brandon's feedback on Round 2 mockups.
- [ ] Schedule a direction/pivots call if Brandon wants one.
- [ ] Incorporate attached brand style guide, workbook, graphics, and creed into the site direction.
- [ ] Capture Keep It Pono, LLC as legal entity context for contracts/billing.

### Coatary Website Edits And Deposit
**Threads:** Gmail `19da6a3364a2647a`, `19d9c05dc7782b93`  
**Date range:** April 17-19, 2026  
**People:** [[Flint Gardner]], Austin Truong, Justin Truong

Flint requested Batch 2 website edits after Round 1 was completed. Austin completed Batch 2 and documented updates to logo sizing, readability, product families, Showroom filtering, Resources labels, and Contact layout. Mercury confirmed Coatary paid invoice `INV-2` for a $150 deposit on April 17, 2026.

**Business context**
- Coatary is already in active delivery and payment-confirmed for the initial implementation.
- Batch 2 included adding Crack Repair as a product family and simplifying Showroom/Resources UX.
- The site uses a system-ui / Helvetica-style font stack for Mockup 5.

**Open items**
- [ ] Replace placeholder Crack Repair copy/photo with final content when available.
- [ ] Confirm whether Resources should be single-column, two-column, or otherwise adjusted after Austin's implementation.
- [ ] Keep invoice/payment status attached to the Coatary project record.

## External Write Safety
- No emails were sent, forwarded, archived, labeled, deleted, or drafted.
- Gmail was used only for search and read access.
