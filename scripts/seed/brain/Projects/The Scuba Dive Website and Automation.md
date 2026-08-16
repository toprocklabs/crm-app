---
name: The Scuba Dive Website and Automation
status: active
client: The Scuba Dive Riverton
tags: [project]
---

# The Scuba Dive Website and Automation

## Goal
Modernize The Scuba Dive's website and streamline the class signup/onboarding workflow, starting with scheduling and course onboarding before replacing RentItBiz rental management over time.

## Status
active

## Notes Log
- 2026-04-26: Gmail backfill captured April 11-22 thread. Toprock sent mockups and proposal links; Kate said the team is definitely interested in moving forward and asked for a call.
- 2026-04-26: Discord backfill added April 10-13 context: Toprock expected the first meeting to be a scoping conversation with rough pricing, prepared the Scuba Riverton proposal and Pacific Scuba Repair mockups, and collected Lightspeed Retail API customer/authentication docs.
- 2026-04-28: Gmail recap to Kate and Preston covered Lightspeed API/token integration, AI-looking website-section concerns, differentiation from other dive-shop sites, Pacific Scuba retainer removal, proposal links, and The Scuba Dive deposit link.
- 2026-04-28: Mercury confirmed Kate Larson paid `INV-4` for `$250.00`, initial deposit for Phase 1.
- 2026-04-28: Drive found `The Scuba Dive - Signed Proposal - April 28, 2026.pdf`; text extraction failed because the PDF appears image-based.
- 2026-04-28: Gmail received course/onboarding templates for Scuba Discovery, Rescue, Nitrox, Refresher, Open Water, Advanced, Drysuit, FRTI CPR, and O2 Provider.
- 2026-04-28: Discord shared booking-flow wireframes and a standalone HTML attachment. Wireframes link: https://claude.ai/design/p/019dd227-1615-7695-9741-d27f8e432435?file=Booking+Flow+Wireframes.html&via=share
- 2026-04-28: Downloaded/read the Discord HTML attachment. It contains a 9-page low-fi customer booking flow covering catalog, detail, schedule, participant count, per-participant registration, review, payment, confirmation, and post-booking email. See [[2026-04-28 Discord Attachment - Scuba Booking Flow Wireframes]].
- 2026-05-01: Granola captured a class booking flow update: multiple sessions per class type, non-consecutive class nights, full-payment booking, separate payer/diver participant handling, upfront photo capture, waiver/medical form integration, and nine automated post-booking email templates.
- 2026-05-01: Gmail and Drive showed Lightspeed developer/OAuth setup activity; Drive's `server.log` confirmed a local OAuth token exchange succeeded. Discord shared the Lightspeed refresh-token documentation link.

## Decisions
- Treat The Scuba Dive as active Phase 1 after deposit payment, pending signed proposal verification.
- Initial design direction should address client concern about sections feeling too AI-generated.
- Keep solution differentiated from other dive-shop sites; avoid generic/cookie-cutter implementation.
- Phase 1 should focus on scheduling/courses before rental replacement.
- Treat the wireframe pack as the current product-structure reference for Phase 1 booking/onboarding planning.
- Use full-payment booking unless the client later asks for deposit handling.
- Build Lightspeed integration read-first, then add write capabilities after authentication and refresh-token handling are stable.

## Open Items
- [ ] OCR/review signed proposal PDF and confirm exact Phase 1 deliverables.
- [ ] Confirm kickoff timing with Kate and Preston.
- [ ] Define automation path for student onboarding emails, e-learning codes, waivers, proof-of-certification requirements, class details, instructor/schedule placeholders, and Google Calendar updates.
- [ ] Convert the 9-page wireframe flow into implementation tasks and data model requirements.
- [ ] Resolve wireframe open questions: deposit option, cancellation wording, cert-proof deferral, photo deferral, physician-clearance path, min ages, waiver/e-sign handling, Lightspeed e-learning code API, instructor naming, tips, and walk-in reservations.
- [ ] Review Lightspeed Retail customer and authentication APIs for feasibility.
- [ ] Implement or verify Lightspeed refresh-token handling.
- [ ] Send updated booking-flow wireframe to the full Scuba team for final review.
- [ ] Get RentItBiz login access if rental replacement remains in scope.

## Related Meetings
- [[2026-04-26 Gmail Backfill]]
- [[2026-04-26 Discord Backfill]]
- [[2026-05-01 Class booking flow update]]
