## Participants

- **Developer ("Them")** — toprock — building the Lightspeed/payment integration; drove the walkthrough
- **Partner ("Me")** — toprock — reviewing the build, product & client-facing decisions

Internal toprock session (no client attendees). The shop owner (referred to as "her") was absent — the payment-plan details that need her input were flagged to follow up on. Granola was used to capture the call.

## 1. Lightspeed sync flow

*The developer walked through the documented flow (kept as a living HTML "manual" rather than a Lucid diagram) for how a website booking lands in Lightspeed.*

- **Email is the unique key:** on booking, the system searches Lightspeed by email to determine whether the person is already a customer. If yes, it reuses the existing record and adds a new SKU; if no, it creates a new customer record.
- **Documentation as a manual:** the developer keeps the flow written up in HTML and revisits it frequently to keep it accurate. The partner noted it reads "like a legit manual" — the kind of thing a tool like Lucid ought to do.
- **Admin mockup:** in the admin, every course is now tied to both a tuition item and an e-learning item; the course-setup screen is meant to query Lightspeed for the available tuition SKUs and e-learning SKUs to pick from (this query wasn't rendering live in the walkthrough because it wasn't running on localhost, and the dev has multiple in-flight payment branches to merge).

## 2. Course / tuition / e-learning SKUs

*A course in Lightspeed is modeled as a tuition SKU plus an optional e-learning SKU — not every course has an e-learning component.*

- Each course (e.g. **Open Water**) maps to a Lightspeed item: a **tuition SKU** and, where applicable, an **e-learning SKU**.
- The data model supports **multiple courses per customer** and the developer built the ability to sync a course to its e-learning item.
- **SKUs must already exist in Lightspeed first.** When a course is created in the toprock admin, its corresponding course SKU has to exist in Lightspeed so the two can be synced together — that's how the system knows which SKU to create on a sale.

## 3. E-learning serial numbers

*E-learning SKUs carry an inventory of serial numbers (the codes the shop currently adds by hand); the sync consumes one and ties it to the buyer.*

- Each e-learning SKU holds an **inventory of serial numbers**. On an e-learning sale, the flow pulls a serial, ties it to the **customer ID in Lightspeed**, and also saves the serial in toprock's own database — so the record exists in two places and can be cross-checked.
- In Lightspeed the customer record shows the serial tied to them; the same serial is visible on the line item, so the shop knows which serial onboarded which customer.
- This mirrors what the shop does today — they **manually add serials** as inventory and assign them.
- **Gap identified:** once a serial is assigned, it still needs to be **delivered to the customer** (the serial / its URL). That delivery step has not been built yet.

## 4. Test bookings & safety

*The developer demonstrated real sales created in Lightspeed — generated from code, not the UI, because payment is intentionally not yet wired in.*

- **Real sales, fake data:** two test items were created, and sales were generated **directly from the integration code** (a fake/non-existent customer was created in the process). Both a tuition sale and an e-learning sale (which consumed a serial) were shown synced into Lightspeed and tied to the test customer.
- **Payment-gated:** the sale is deliberately not fired until a real payment happens. To test the sync end-to-end before payments exist, the developer **mocked the trigger in code** rather than going through the booking UI.
- **Guardrails:** the integration is heavily protected so it **never reads or writes anything except explicitly-labeled test accounts**, preventing any accidental changes to real shop data.

Conclusion of the walkthrough: the write side / Lightspeed sync is confirmed working. Next up is payments.

## 5. Stripe vs. Square — the payment decision

*The core constraint: a Stripe account ties to exactly one bank account, and the shop runs multiple businesses across multiple banks. That forced a choice between mixing processors or running multiple Stripe accounts.*

- **Option A — two processors (Stripe + Square).** Courses / classes (and rentals) go through **Stripe** into one bank account; **trips stay on Square** (where they live today) into the travel bank account. Downside: the code must manage **two separate payment APIs** and juggle which to use when — balancing two sets of API keys is error-prone and easy to misroute.
- **Option B — Stripe only, two accounts. Chosen.** Use **Stripe for everything** but create **a second Stripe account** tied to the other bank account. One API, cleaner code, money still routes to the correct bank. Stripe's API is also considered better than Square's. The shop can still keep Square if they want, but the recommendation is all-Stripe.

### The takeaway

The team decided to **make the recommendation rather than ask** the client to choose: tell the shop "to make all of this work the way we want, please create two Stripe accounts, one per business." The expectation is the shop won't object given everything else being built. The plan doc will be updated to reflect Stripe-only with two accounts (dropping the Stripe-vs-Square branching that was getting confusing).

**Sale creation is payment-gated:** the system won't create the Lightspeed sale (or run the rest of the process) until Stripe confirms the payment — so the shop's back-end totals can't be miscalculated by a sale that didn't actually get paid.

## 6. Entities & bank accounts

*To structure the payment routing clearly, the developer wants the businesses' details organized rather than referred to vaguely as "one account, another account."*

- **Courses / classes** (and rentals) → Stripe → the shop's current/main bank account.
- **Trips** → currently Square → the travel bank account. In the all-Stripe plan, trips would move to a second Stripe account tied to that same bank.
- The developer asked for the businesses' **EINs and business names** so the entities/accounts can be labeled and grouped in the plan, making routing unambiguous.

**Defer: trips are out of scope for now** — the team just wants to be aware of them for the future; no trip-payment work needs to happen in this iteration.

## Decisions made

| Topic | Decision |
| --- | --- |
| Lightspeed sync | Confirmed working — match/create customer by email, create sale + tuition SKU, assign e-learning serial from inventory, save in Lightspeed and our DB. |
| Payment processor | Recommend **Stripe for everything** (drop the Stripe-vs-Square split). Cleaner: one API instead of juggling two. |
| Stripe accounts | Use **two Stripe accounts**, one per business / bank account (a Stripe account ties to a single bank account). |
| Client approach | Present this as a recommendation, not a question — ask the shop to open two Stripe accounts. |
| Sale timing | The Lightspeed sale only fires after Stripe confirms payment, so back-end totals stay accurate. |
| Trips | Deferred — no trip-payment work this iteration; just noted for the future. |
| Documentation | Keep the integration flow as a maintained HTML "manual" rather than a Lucid diagram. |

## Open questions

**Open — How does the payment plan / schedule work, and will the shop owner sign off on the all-Stripe approach?**
Several payment-plan details need the owner ("her"), who wasn't on this call. Follow up with her before finalizing.

**Open — What are the EINs and business names for each entity?**
Needed so the accounts/entities can be organized clearly in the plan and payments route to the right bank. Pending from the client.

**Open — How do we deliver the e-learning serial / URL to the customer after assignment?**
The assign-to-customer step works, but customer-facing delivery of the serial/URL hasn't been built yet.

**Resolved — Can you create multiple Stripe accounts for one organization?**
Yes — that's the basis for the two-account plan, one per bank account.

**Resolved — Stripe-only or mix Stripe + Square?**
Stripe-only with two accounts — avoids managing two payment APIs and the risk of misrouting.

**Resolved — Can we test payments without charging real cards?**
Yes — use a Stripe sandbox; the sync itself was already validated by mocking the trigger in code.

## Cadence going forward

Lightspeed sync is done and confirmed. Next: lock the Stripe-only / two-account decision with the client, get the accounts + EINs, then wire payments behind a sandbox and gate sale-creation on confirmed payment. Trips stay parked until a later phase.

---

*Compiled from the May 26, 2026 meeting transcript ("Payment Convo Transcript 5/26") — corrections welcome.*
