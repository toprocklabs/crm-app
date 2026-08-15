## Participants

- **Austin (Speaker A)** — Dev — driving the demo
- **Speaker C** — Dev — product / integrations
- **Shop owner (Speaker D)** — Client — owns dive shop & trips
- **Preston (Speaker B)** — Client — instructor / shop ops

## 1. Booking flow walkthrough

*The full customer journey lives inside the existing website now — no redirect to a 3rd party. Visual direction borrows from the two mockups the shop liked: water-feel, but brighter and more vibrant than the dark version.*

The flow: course → cohort → divers → age check → payment → paperwork → medical → review.

### Notable behaviors

- **Stay-on-site:** /courses is now part of the same site — no third-party redirects.
- **Cohort visibility:** available dates render as selectable tiles; capacity decrements automatically as seats fill.
- **Per-diver flow:** "How many divers?" then one form per diver. Total cost shown before continue.
- **Age enforcement:** if a diver's DOB doesn't meet the minimum age, the form blocks continue with a clear message ("class participants must be at least 10 years old").
- **Progress indicator:** a step header is visible throughout so the customer always knows where they are.
- **Cancellation policy:** surface the shop's real policy text on the review screen (placeholder copy in the demo).

## 2. Paperwork & signatures

*The shop's existing liability form has been converted to a digital initial-and-sign flow. The system stores a digital signature audit trail (timestamp, IP, user) which is standard practice for e-signatures.*

- **Initial each clause** then a single signature at the end.
- **Guardian signature** is supported as an optional second signature when the diver is a minor.
- **Witness signatures** — confirmed customers can bring the form in and have a classmate sign as witness.
- **Skip address?** Currently allowed — shop to decide if it should be required.
- **What to digitize?** Shop wants *most* things digitized. Refresher, Snorkel, and Scuba Discovery forms can stay digital-only (no printing). All other course forms still need to be printable for the student folder.

### Form fidelity vs. legal text

The digitized layout doesn't match the PDF exactly — the wording is the same but the format is custom. Shop owner to verify with their legal/training agency that the wording (not the layout) is what matters. If wording is the only requirement, that simplifies our life significantly; otherwise we'll match the source layout more closely.

## 3. Medical questionnaire

*Preston flagged the most important UX change of the meeting: the second section of the medical form should only appear when needed.*

- **Current demo behavior** — all 10 questions on page 1 are followed by the second-page (Box B) questions unconditionally. Customer signs a second part even when none of it applies.
- **Desired behavior** — if every answer in Box A is *No*, Box B should not render; one signature is enough. If *any* Box A answer is *Yes*, Box B appears with the targeted follow-ups.

### Physician sign-off triggers

Specific Yes answers in Box B require a physician's signature on a separate page (e.g., age 45+, pregnancy, certain medical history). The shop wants:

- An inline pop-up the moment a customer answers in a way that will require a physician sign-off — before they finish booking — explaining what they'll need to do.
- A PDF of the physician form they can download and take to their doctor.

Today the demo only shows it as "optional details," so the Box B questions still need mapping to the physician trigger set.

### Per-diver capture

The flow already captures medical responses per diver (Diver 1, Diver 2…) and surfaces them again in the final review.

## 4. Admin panel

*Behind-the-scenes panel for the shop to manage everything they saw on the customer side.*

| Area | What it does | Notes |
| --- | --- | --- |
| Bookings | List of bookings, who signed up for what cohort, expand to see all divers in a booking. | Cancel-seat action available. |
| Classes | The course catalog: Open Water, Advanced, Refresher, etc. Edit image, min/max age, description. | One row per course type. |
| Cohorts | The scheduled instances of each class — specific dates, capacity, sessions (pool / open water), instructor name. | Terminology "cohort" OK for now; revisit if it confuses staff. |
| Trips | Same shape as cohorts but for travel (Fiji, Indonesia, etc.). Editable per-trip. | Payments handled differently — see §9. |
| Waivers | Tracks every customer's signed paperwork; download / print each as PDF. | Print action goes straight to a PDF for the student folder. |

### Feature requests confirmed in the meeting

- **Allow waitlist** per cohort. Shop strongly wants this — classes shuffle constantly and a waitlist would replace a lot of back-and-forth.
- **Filter cohorts by month** in the admin *and* on the customer-facing course page (see §5).
- **Payment-plan toggle per course/trip** — some courses are paid in full, trips take a deposit + later balance. Setting lives on the class/trip record.

## 5. Design feedback & refinements

*Preston's main UX note: the cohort list gets long — help customers narrow it down before they scroll.*

- **Month filter on the course page.** Above the list of cohorts, surface a month-pill / toggle (May, June, July, August…). Picking a month filters the cohort tiles below to that month only. **Decided.**
- **Schedule horizon:** shop wants to publish *3–4 months* of cohorts in advance. (Today they're typically out through July; August will be added this week.) Roughly 5–6 schedules per month per course.
- **Cancelled cohorts** shouldn't show up to customers — the demo accidentally surfaced one. Filter them out by default in the customer view.
- **Visual direction:** the merged "water but bright/vibrant" mockup is the agreed direction. Content/copy is still placeholder — we're showing flow not finals.

## 6. Contact form bug — Urgent-ish

The shop's current website (pre-v2) has a contact form. After getting flooded with ~20–30 spam submissions a day, they added a reCAPTCHA — and now **zero** submissions are getting through. Customers are reporting they sent the form and the shop never got it.

- Build a contact form on the new site for both **Pacific Scuba** and **Scuba Dive** sides.
- Delivery via email is fine — "I think email is best." Optionally also surfaced in the admin panel.
- Replace the broken reCAPTCHA setup with something that actually delivers (we'll pick a spam-resistant approach that doesn't silently drop).

## 7. Lightspeed integration scope

*API access already works (Austin pulled the customer list end-to-end). Now we need to define exactly what the booking system writes back to Lightspeed.*

### Three writes per booking

| Step | What we do in Lightspeed | Why |
| --- | --- | --- |
| 1 | Create / match a customer record. | Verify whether they're an existing customer; create one if not. Lightspeed remains the customer source of truth. |
| 2 | Add a sale line for the course SKU on the customer's profile. | Lightspeed tracks sales and reporting. Each course (Open Water tuition, Advanced, etc.) already exists as an item. |
| 3 | Pull next available e-learning code from inventory and assign it to the customer. | See §8 — codes are inventory items in Lightspeed. |

### Testing approach

Austin will create a `Test E-Learning Code` inventory item ($0) and a fake test customer so we can exercise create/assign/decrement without touching real inventory or real customers.

## 8. E-learning codes (SDI)

*Today this is a tedious copy-paste workflow. We're keeping Lightspeed as the system of record but making the day-to-day vanish.*

### How it works today

- Owner buys codes from the SDI portal (Open Water in bulk; Divemaster a few at a time because they're expensive).
- SDI generates the codes immediately in their portal and also emails them as a list.
- Owner manually copies each serial into Lightspeed as inventory under the matching SDI e-learning item (e.g. `SDI Open Water E-Learning` → Serial Numbers).
- When a sale happens, Lightspeed pulls one serial off the stack and links it to that customer; the receipt shows the code.
- If a customer loses or never receives their code, the shop looks up the customer in Lightspeed inventory and re-sends it.

### How it works after this integration

- Booking flow auto-pulls the next available code from Lightspeed inventory and assigns it to the customer.
- The shop can paste new codes into our admin once instead of one-by-one into Lightspeed — we'll push the inventory update for them.
- If we attempt to assign and inventory is empty, surface an admin-visible error so they know to restock.
- **Lightspeed remains source of truth** — manual sales (private/semi-private classes booked over the phone) still happen there directly and should not be broken by our flow.

## 9. Trips & payment-account separation

*Trips are a separate business with a separate bank account. We're deferring trip payments to a later iteration to keep this first release focused.*

### Why trips are different

- Travel is a separate legal entity with its own bank account — trip money must *not* co-mingle with retail/scuba money.
- Trips have **deposits** ($250–$500) followed by larger balance payments over time (Fiji final balance was ~$78k).
- Today: deposit can be paid online via Rena Biz (rare — "1 in 50") then balance payments go through Square in person / on the phone, with cards on file.
- Some trip links currently point to the PDF flyer instead of the cart page (e.g., Indonesia) — pre-existing bug on the current site, separate from this project.

### Decision for this release

**Defer.** Don't try to solve trip payments in the first iteration. We'll wrap class bookings + Stripe + Lightspeed first, then circle back to trips and the two-bank-account split (Stripe Connect or equivalent).

## Decisions made

| Topic | Decision |
| --- | --- |
| Booking lives on-site | No third-party redirect. Customer never leaves the website. |
| Visual direction | Use the merged water-but-vibrant mockup as the baseline. |
| Medical form logic | Conditional render Box B only when any Box A answer is Yes. |
| Physician sign-off | Surface an inline heads-up + downloadable PDF as soon as an answer triggers the requirement. |
| What to digitize | Digitize most paperwork; Refresher, Snorkel, Scuba Discovery can be digital-only (no print). |
| Cohort UX | Add a month filter above the cohort list on the customer-facing course page. |
| Waitlist | Build it — high value, shop will use this constantly. |
| Lightspeed integration | Three writes: customer, course sale line, e-learning code assignment. |
| E-learning codes | Lightspeed remains source of truth. Booking flow pulls + assigns automatically. |
| Trip payments | Deferred to a later iteration; ship class bookings first. |
| Communication | Move correspondence to a shared email thread (CC both Austin & partner) so there's a paper trail. |

## Open questions

**Open — Does the digitized liability text need to match the source layout, or only the wording?**
Owner to verify with their training agency / legal. If wording-only, we keep our cleaner custom layout.

**Open — Should "skip address" remain an option on paperwork, or be required?**
Shop to decide before launch.

**Open — Is the physician sign-off PDF already linked from the current site?**
Owner to check; if not, they'll send the PDF so we can host it.

**Open — What name should we use instead of "cohort"?**
"Cohort" reads fine to the shop for now — not blocking. Revisit if retail staff find it confusing during testing.

**Resolved — Should we own e-learning code management, or keep it in Lightspeed?**
Lightspeed stays the source of truth (so manual / phone sales don't break). We integrate with it.

**Resolved — Are private / semi-private classes part of the booking system?**
No — those are scheduled by phone / in-person with the shop and don't go through the public booking flow.

## Cadence going forward

Iterate on the booking flow until the shop is happy — *then* bolt payment on top, *then* Lightspeed sync, *then* trips. One thing at a time.

---

*Compiled from the May 23, 2026 meeting — corrections welcome.*
