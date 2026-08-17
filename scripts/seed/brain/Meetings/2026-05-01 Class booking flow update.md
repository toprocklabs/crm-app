---
date: 2026-05-01
source: Granola
attendees: [Justin]
companies: [The Scuba Dive Riverton, Pacific Scuba Repair]
tags: [meeting]
---

# Class booking flow update

**Date:** 2026-05-01  
**Attendees:** [[Justin]]  
**Companies:** [[The Scuba Dive Riverton]], [[Pacific Scuba Repair]]  
**Source:** Granola meeting `a5cd2da6-b5e4-4862-9041-43a1707f09f2`

## Summary
The meeting captured updated requirements for The Scuba Dive's class booking flow and the technical path for Lightspeed integration. The desired flow includes class catalog, class detail pages, schedule/session selection, participant/payment separation, per-participant registration, required photo/proof capture, full-payment checkout, and automated follow-up emails by class type.

## Decisions
- Use full payment for booking; no deposit option was requested in this update.
- Keep the initial implementation focused on course booking/onboarding rather than solving all RentItBiz rental replacement at once.
- Approach Lightspeed integration with read access first, then add write capabilities after authentication is stable.

## Action Items
- [ ] Justin: send the updated wireframe to all participants for final review.
- [ ] Justin: complete Lightspeed API authentication and testing.
- [ ] Justin: set up a 24-hour refresh-token system for ongoing Lightspeed integration.
- [ ] Client team: review the wireframe with the full team and provide final feedback.
- [ ] Client team: escalate Pacific website access with the current developer or consider a domain dispute path.

## Notes
Important requirements include multiple sessions per class type, non-consecutive class nights, forced upfront photo capture for certifications, nine automated post-booking email templates, waiver/medical-form support, equipment add-ons, and links to the existing e-commerce path. Pacific Scuba website access remains a major blocker because the existing developer has been unresponsive to handoff requests.
