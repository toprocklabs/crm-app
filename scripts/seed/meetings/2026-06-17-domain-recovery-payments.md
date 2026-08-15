## Participants

- **Austin (Speaker A)** — toprock — dev, driving the demo
- **Partner (Speaker C)** — toprock — integrations, sales & people-finding
- **Shop owner (Speaker B)** — Client — runs The Scuba Dive & Pacific; homework owner
- **Eric** — Client — co-owner; handling owner emails
- **Preston** — Client — instructor; owns the Pacific form request
- **Christy** — Client — staff; testing & gear-rental spreadsheet

External names referenced: **Glenn** (sold Pacific Scuba; now in Italy), **Jeff** (Glenn's friend, controls the domain/DNS), **Darren** (SDI rep).

## 1. Pacific Scuba domain recovery — Urgent

*This now somewhat trumps the rest of the project — leads are actively being lost. Hundreds of "Contact Us" submissions are landing in the previous owner's email and the shop can't get to them.*

### The situation

- The shop bought the business but never got control of the website. Contact-form submissions (a couple hundred so far, per a spreadsheet the seller shared) are stuck routing to the old owner's inbox.
- **Glenn** (who sold Pacific Scuba, now living in Italy) is responsive and friendly but doesn't hold the technical access. His longtime friend **Jeff** has been running/updating the site and controls the domain — and Jeff has gone quiet after ~3 emails.
- The domain is registered through **Squarespace** (Squarespace acquired Google Domains, where it was originally bought). So this is a Squarespace transfer, not Google.
- The shop has offered to pay Jeff for his work; the blocker is access/ownership, not money. He simply has no incentive to act.

### Two parallel paths

- **Path A — formal transfer request.** Shop creates a Squarespace account; toprock drafts a firm message to the current owner: as part of the business purchase, the domain must be transferred. Attach the domain to the new Squarespace account, transfer ownership, then move management where we need it. Explicit instruction: *do not change DNS or name servers*.
- **Path B — escalate to Squarespace.** If the owner won't act, simultaneously email Squarespace with the **bill of sale / proof of purchase** and ask them to escalate to their legal team to force the transfer (unlock the domain + send the authorization code).

### The faster route the team will take

Rather than wait on emails, the toprock partner will go **directly to Jeff** — "be your quote-unquote persistent third party." They know exactly what to ask for, can take the work off Jeff's plate ("just give us access, we'll do the transfer"), and have tools to find his contact info. The shop will supply what they know about Jeff (email, that he's in California, rough age ~50s–60s) so the partner can locate him and call.

## 2. Lightspeed sync demo

*Austin demoed the connected back end: a booking on the site now flows straight into Lightspeed, so everything stays synced without manual entry.*

### What's working in the demo

- **Auto-create customer:** when a booking comes through, the system programmatically creates the customer in Lightspeed — no more manual typing.
- **De-duplication:** it checks whether the person already exists and pulls the existing record instead of creating a duplicate.
- **Sale & SKU:** the checkout creates a sale and a SKU line (a demo `e-learning code` SKU was shown).
- **Code assignment:** the flow can take an e-learning code from inventory and tie it to the customer automatically.
- **Safe testing:** Austin used a clearly-labeled fake "Top Rock" test account so nothing touched real data.

Net takeaway from the shop: *"That's huge."* The site can streamline directly into Lightspeed and keep it updated.

## 3. SDI e-learning process (the new wrinkle)

*SDI recently told the shop that instead of routing e-learning codes through Lightspeed, the shop can register a student directly in the SDI portal and the code is issued there. The question: how does that interact with what we're building?*

- **Today (via Lightspeed)** — shop logs into the SDI store, buys codes in bulk, enters each as inventory in Lightspeed (e-learning is a taxed line item; tuition is not — so they're kept separate). On sale, the customer gets the code.
- **SDI's new option** — shop enters the student's name in SDI, starts their profile, and the code is attached to them inside SDI. The customer may never even see a raw code; they just log in. Removes the Lightspeed e-learning inventory item.

### The tension: accounting source of truth

If e-learning moves fully to SDI, the shop wouldn't track that purchase in Lightspeed. Austin's concern: for clean accounting, **Lightspeed should stay the source of truth** for what a customer paid. Options discussed:

- Keep a course SKU in Lightspeed and mark it tracked-but-not-charged (e.g., a **$0 miscellaneous sale** linked to the customer) so the record exists without double-charging — likely entered manually since the system won't know when the SDI side was paid.
- Or let the two systems run separately and have the accountant merge them later (less clean).

A code is only ever issued *after* payment — same rule whether through Lightspeed or SDI — so no code attaches to a name until a class is paid for.

### Could we automate it?

Austin wants to know if SDI has an **API** so the create-profile/assign-code step could be automated the way Lightspeed now is. Unknown whether SDI is that technical.

**Background (PADI vs SDI):** the shop is no longer a PADI shop (PADI won't certify a shop affiliated with another agency, and is significantly more expensive — ~$200 more per cert). They run PADI & SDI through individual instructors; customers can mix-and-match agencies. The only customer-facing difference is how the instructor teaches it (PADI is stricter).

## 4. Stripe payments

*With the booking flow solid, payments are the next build piece. The recommendation is Stripe for online payment processing, handled inside the system toprock is building (not through Lightspeed).*

- Anything online flows through Stripe. Setup will require ownership/identity verification, similar to what they did with Square.
- **Two Stripe accounts** — because the businesses are separate legal entities with separate banks: **courses** under The Scuba Dive account, **trips** under the Travel entity. The system knows where each payment routes.
- Customers never leave the site — they buy trips and courses in one place. Staff can also pull a payment up online and take it in person, so the **Square card device can be retired** (it's currently only used for trips).
- Stripe can also **send invoices** — handy for trip deposit reminders ("here's your next payment that's due"). No physical reader needed; manual card entry or a pay link works.
- Fees look broadly similar to Square; the team will double-check exact rates (manual-entry / card-not-present carries the usual percentage + per-transaction cents).

### Rollout

Start with **one Stripe account for courses now**; the travel account can be created in parallel. Once toprock has access, payments get wired in and tested slowly with trial/test orders before going live.

## 5. Trips & the three entities

*Trips are a separate business with their own bank account — trip money must not co-mingle with scuba/retail money. Trip payments are deferred to a later iteration to keep this release focused.*

### How trips work

- **$500 non-refundable deposit** reserves a spot. The deposit is non-refundable because it's passed straight to the resort.
- A **payment schedule** aligns the customer's payments with the deposits the shop owes the resort (e.g., a $4,000 trip split into ~4 payments). Customers can pay early or more, but must hit each milestone by its date.
- Today: trips are listed on RenItBiz, but payments are taken on **Square** (so they hit the travel bank account, not the scuba account). Cards are often kept on file with customer consent.

### Three separate entities

| Entity | What it covers | Payment today |
| --- | --- | --- |
| The Scuba Dive | Courses / classes | → moving to Stripe (courses account) |
| Travel | Trips | Square now → future Stripe (travel account) |
| Pacific Scuba Repair | Reg service / mostly shipped repairs | Square (charged on ship); stays as-is for now |

**Defer:** don't solve trip payments in the first iteration. Ship class bookings + Stripe + Lightspeed first, then circle back to trips and the two-bank-account split.

## 6. Rentals / RentItBiz

*Phase 2 was originally framed as replacing RentItBiz for rentals — but priorities shifted in this meeting.*

- The shop originally got RentItBiz for rentals, but it's now **more important for courses** — and the courses build is what's replacing it first.
- Christy started a **spreadsheet** to check out gear (scan items in/out). The sticking point: handling multiple units under one person (e.g., one customer needs five tanks vs. one). Rentals are never charged — it's purely a tracking system.
- **Decision:** the shop feels there are other options for the rental system and isn't worried about it. Don't kick RentItBiz until the inventory side is genuinely ready. Test, iterate, and move slowly.

## 7. PDF signing

*The team solved signing directly on the actual PDF — the signature is placed on top of the real document rather than generating a separate PDF.*

- Austin will send a sample PDF of what the signed output looks like for the shop to confirm.
- Prior feedback (e.g., the age bugs) was folded into the latest build; the shop should re-test and keep giving feedback so the team can iterate.

## 8. New Pacific Scuba Repair check-in form

*Preston's request: a simple digital check-in form for customers dropping off regulators for service. Replaces the current paper form and creates a signed record of what service was requested.*

### Why

Disputes happen ("I didn't want my mouthpiece changed" / "I dropped off X"). A signed form means the customer confirmed exactly what they asked for. ~80% of Pacific customers ship in; some walk into the dive shop without realizing it's the same location.

### What it captures

- Name, phone, email, date brought in.
- Service selections via checkboxes — e.g., change mouthpiece, hoses, batteries, or leave as-is.
- A **signature** confirming the selections (the key requirement).
- Trip/deadline field if applicable.

### Decisions & constraints

- **Separate system** from The Scuba Dive — Pacific is a different company; keep it standalone. Can be handed on an iPad/tablet or filled on the existing surface.
- **Retention:** 90 days is fine. Turnaround is ~7–10 days, and all detail is transferred into Pacific's internal "data capture report" / service software anyway, so the form is just the check-in handshake.
- Doesn't need to be a heavy legal form — no terms-of-service required unless Preston wants to add any acknowledgement text.

## 9. Billing & referrals

- The shop offered to pay more, noting the scope has grown. toprock's approach: the courses work is covered by the existing engagement; the shop has paid the **first half of the deposit**, and toprock wants to **deliver before collecting the second half**.
- **Big new features** (rentals, trips, the Pacific form, etc.) will be **scoped and quoted separately** — "here's what rental costs, here's what this costs."
- The most valuable thing the shop can offer right now is **referrals**. They named a local **chiropractor** they communicate with and gave the okay to drop their name.

## Decisions made

| Topic | Decision |
| --- | --- |
| Domain recovery | Pursue Squarespace transfer; toprock goes directly to Jeff to reduce friction, and will draft owner + Squarespace-escalation messages. |
| Lightspeed | Stays the accounting source of truth. Booking flow auto-creates customer, sale SKU, and assigns an e-learning code. |
| SDI e-learning | Keep tracking the course/sale in Lightspeed (possibly a $0 misc line) even if codes shift to SDI; explore whether SDI has an API to automate. |
| Payments | Use Stripe. Two accounts — courses (Scuba Dive) and trips (Travel). Start with courses now. |
| Square device | Can be retired — Stripe handles trips online / via invoice; no physical reader needed. |
| Trips | Deferred to a later iteration; ship class bookings first. |
| Rentals / RentItBiz | Deferred. Courses are the priority; don't kick RentItBiz until inventory is ready. |
| Pacific check-in form | Build as a separate, simple, signed form. 90-day retention is fine. |
| Billing | Deliver courses before collecting the second half; new large features scoped separately. |
| Rollout cadence | One thing at a time: nail bookings → add payments → Lightspeed → then trips. |

## Open questions

**Open — Will Jeff / the old owner cooperate, or do we escalate to Squarespace?**
Going directly to Jeff first (faster). Squarespace-with-bill-of-sale escalation is the fallback if he stays unresponsive.

**Open — Does SDI have an API to automate profile creation + code assignment?**
Unknown — need SDI login access and the rep (Darren?) to find out. May end up manual.

**Open — Keep e-learning as a Lightspeed SKU, or move issuance fully to SDI?**
Leaning toward keeping a Lightspeed record for accounting (even $0), regardless of where the code is issued.

**Open — Exact fields for the Pacific check-in form?**
Preston to confirm; baseline is name / phone / email / date / service checkboxes / signature.

**Resolved — Should the shop keep a physical card reader?**
No — Stripe online + invoices covers trips; the Square device can go.

**Resolved — Is the rental system blocking launch?**
No — rentals are deferred; courses ship first and RentItBiz stays until ready.

## Cadence going forward

One step at a time: iterate on the booking flow until the shop is comfortable, *then* bolt on Stripe payments, *then* finish the Lightspeed/SDI sync, *then* tackle trips and rentals as separately-scoped phases.

---

*Compiled from the June 17, 2026 meeting transcript — corrections welcome. References: signed proposals & prior session notes in the project Drive folder.*
