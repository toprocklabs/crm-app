# 2026-04-28 Discord Attachment - Scuba Booking Flow Wireframes

## Source
- Discord channel: `#thescubadive`
- Message: https://discord.com/channels/1489456297672970250/1492696125084405790/1498895545379586200
- Attachment name: `Booking_Flow_Wireframes__standalone_.html`
- Downloaded local copy: `E:\Codex Projects\toprock_brain_scheduled_run_jt\logs\discord-attachments\Booking_Flow_Wireframes__standalone_.html`
- Unpacked readable HTML/assets: `E:\Codex Projects\toprock_brain_scheduled_run_jt\logs\discord-attachments\Booking_Flow_Wireframes_unpacked.html`

## Summary
The attachment is a low-fidelity wireframe pack for The Scuba Dive class booking flow. It covers a 9-page customer journey from class catalog through confirmation email and explicitly calls out mobile/desktop variations, conditional participant-registration branches, class-specific requirements, payment states, and implementation questions.

## Flow Pages
- Page 1: Class Catalog
- Page 2: Class Detail
- Page 3: Date & Session Picker
- Page 4: Participant Count
- Page 5: Per-Participant Registration
- Page 6: Booking Review & Promo Code
- Page 7: Payment
- Page 8: Confirmation
- Page 9: Automated Post-Booking Email

## Classes Included
- Scuba Discovery
- Open Water
- Advanced
- Rescue
- Nitrox
- Refresher
- Drysuit
- FRTI CPR
- O2 Provider

## Key Product Requirements Captured
- Catalog should replace the Rentitbiz class/category page with scannable class cards, pricing, levels, duration, prerequisites, next available session, and mobile search/filter variants.
- Class detail pages need class-specific content and callouts, including Open Water e-learning time/pass-score, required personal mask/snorkel/fins, Nitrox classroom-only messaging, Rescue prerequisites, Drysuit rental discount, and Discovery certification upsell.
- Scheduling needs two modes: calendar-first for shorter classes and cohort/session-list selection for multi-night classes. Multi-night cohorts are treated as one bookable unit.
- Session availability should show seats left, full-session waitlist, instructor, pool/location details, and warnings when e-learning lead time is tight.
- Participant count supports group booking, capacity limits from available seats, and parent/guardian booking where the payer is not diving.
- Registration loops per participant and branches by class type: identity/contact, existing certification proof, profile photo, medical form, physician sign-off, liability waiver, and equipment/add-ons.
- Review page shows class/session details, participant status badges, cancellation-policy acknowledgment, promo code, tax, and total.
- Payment page assumes Stripe Elements, pay-in-full/deposit options, optional save-card/tip, processing state, and failure/retry state with a 15-minute booking hold.
- Confirmation page shows booking number, class schedule, calendar links, participant status, e-learning code, day-one checklist, receipt, and deferred action links.
- Email page proposes one SendGrid template per class type triggered by `booking.confirmed`, using merge tags from the booking record.

## Open Questions From Wireframes
- Whether high-priced classes should support deposit instead of pay-in-full.
- Exact cancellation-window wording.
- Whether group bookings always use one card.
- Whether certification proof can be deferred with an "I'll bring it in" option.
- Whether profile photo can be deferred or should block completion.
- Whether physician sign-off can be handled as book-now-clear-before-class.
- Minimum age per class.
- Whether a custom e-sign waiver is acceptable or SDI requires portal/PDF handling.
- Whether Lightspeed can provide or receive e-learning code data through API.
- Whether instructor should always be named at booking time.
- Whether to include tip options.
- Whether walk-in seat reservations need a staff path.

## Out Of Scope In Wireframe
- Operator dashboard.
- Final visual/brand design.
- Lightspeed, Google Calendar, and Stripe integration design details.
- Equipment rental product beyond booking-flow add-ons.

## Links
- [[The Scuba Dive Website and Automation]]
- [[The Scuba Dive Riverton]]
- [[2026-04-28]]
