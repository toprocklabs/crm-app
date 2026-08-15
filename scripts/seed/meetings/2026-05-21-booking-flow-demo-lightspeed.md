## Participants

- **Austin (Speaker A)** — Top Rock — dev, driving the demo
- **Partner (Speaker C)** — Top Rock — integrations & process / Lightspeed planning
- **Shop owner (Speaker D)** — Client — owner, runs the shop; homework owner
- **Preston (Speaker B)** — Client — instructor; medical-form expertise

Names referenced: **Alex** (provided the design direction Top Rock merged), **Christy** (shop staff — good at finding bugs, will help test), **Tatiana** (Austin's wife — sample customer record looked up in Lightspeed). The shop leaves for a 30-person Fiji dive trip in ~1.5 weeks.

## 1. Custom booking flow demo

*The flow lives entirely on the shop's own site — "we're not leaving, we're not moving." It replaces the retrofitted RentItBiz experience with something custom-built for the shop.*

### What was shown

- **Design:** Top Rock merged the two directions Alex liked — kept the "water" feel but lighter and more vibrant. Content is still placeholder; the demo was about *flow*, not final copy. "The bones of it."
- **Cohorts:** each course shows its dated sessions ("cohorts") with dates between classes, and **automatically shows which ones have spots left** and hides/reduces filled ones. The shop liked that it's clearly improved from the previous visit. Terminology for "cohort" is still open — works for now.
- **Multiple divers:** the buyer selects how many divers and fills each one in turn; the running cost total shows before continuing.
- **Age validation:** a wrong/under-age birthday is rejected inline (e.g. "class participants for this must be at least 10 years old"); the flow won't advance until it's fixed. The shop confirmed they want age enforcement.
- **Cancellation policy** shows before payment — Top Rock will drop in the shop's real policy text.
- **Step indicator** at the top always shows the customer where they are in the process. The shop liked this.
- **Final review** re-summarizes everything (divers, medical responses, signatures) before "sign & save paperwork," then auto-emails the schedule, onboarding info and e-learning code.

### Shop feedback — month filter

With 5–6 schedules per month, scrolling a long list of cohorts is painful. The shop asked for a way to **pick the month first** ("they know they don't want a class till August") and then see only that month's options. Top Rock proposed a **toggle/filter** at the top of the cohort list. The shop wants 3–4 months of classes published in advance (currently out to ~July; August going up this week).

## 2. Digital paperwork & signing

*Top Rock took the shop's existing liability and medical documents, formatted them into a digital flow, and built inline initialing and signing — all before the first class session.*

- **Liability waiver:** the shop's document was turned into a digital form with click-to-initial sections and a signature at the end. **Guardian signature** (optional) and **witness** support are included — witnesses can be brought in and a classmate can sign.
- **Timestamping & audit trail:** the system records when each item was completed and produces a **digital-signature audit trail** (standard practice / required for digital signatures).
- **Signed output format:** rather than overlaying onto the original PDF, Top Rock rebuilt the documents in a clean format with the *exact same wording*. Open question: whether, legally, only the language matters or the format must match too. If only wording matters, that makes things much easier; otherwise the shop can have someone review for missing wording so Top Rock can add it.
- **Visibility for staff:** the shop can see who has/hasn't completed paperwork ("these people start class tomorrow night and haven't done their paperwork").

### What to digitize vs. print

Not everything should be digitized. The shop wants to **print certain forms for the student folder**, while others (refresher, snorkel, scuba discovery) can stay digital-only — getting them out of "drawers and boxes" of paper. Top Rock asked the shop to specify which documents they want digitized.

## 3. Medical questionnaire logic

*Preston flagged the most important paperwork change: the medical questionnaire is conditional, and the current build treats it as always-required.*

### The conditional flow

- The first **10 yes/no questions** are the gate. If **all answers are "no," the second part should not appear at all** — no signature needed for that section.
- If any answer is "yes" (e.g. "I am over the age of 45"), the customer is routed to **Box B**; certain "yes" answers in Box B then require a **physician's sign-off**.
- The shop strongly wants this done **before** a customer shows up — today people fill it out on arrival and only then discover they can't get in the water without a physician signature. "If they come all gung-ho ready to get in the water, but then put a yes… we all of a sudden can't let them in the water."

### What Top Rock will build

- **Conditional rendering:** hide the sign-off section unless a "yes" is present (currently it always shows / treats it as optional details).
- **Physician-sign-off heads-up:** when an answer triggers a physician requirement, pop a heads-up telling the customer they need a doctor's signature before getting in the water, and offer the **physician PDF** to print and bring.
- The shop currently emails the medical form to customers **with their e-learning code**, so attaching it earlier in the flow fits their process.

## 4. Admin panel

*Top Rock built an admin/back-office where the shop can customize everything the customer sees and manage operations. Login access had a hiccup during the demo (sign-in link issue) but it loaded later via Vercel.*

- **Bookings:** shows exactly who booked, opens the cohort, and shows class details — date, capacity, sessions, instructor name, who has signed up; lets staff **cancel a seat**.
- **Classes:** edit each course — image, **minimum/maximum age**, etc.
- **Cohorts:** manage the specific dated groups under each class.
- **Trips:** trips can now be added/edited here too (the sold-out Fiji trip was used as an example).
- **Waivers:** every signed waiver is tracked, downloadable and printable (print opens the PDF).
- **Wait list:** the shop spotted an "allow wait list" setting and loved it — "classes are constantly changing… having a wait list would be awesome."
- **Per-course payment settings:** the shop wants to control which courses allow payment plans/deposits vs. pay-in-full (classes are pay-in-full; trips take deposits).

## 5. E-learning codes & Lightspeed

*Top Rock's Lightspeed API connection is working (it can pull customers). The session mapped exactly what the shop does by hand today so it can be automated — with Lightspeed staying the system of record.*

### How the shop works today (all manual)

- The shop buys **SDI e-learning codes** on the SDI portal; they're generated instantly on screen (and emailed). The owner then **copies and pastes each serial number one-by-one** into Lightspeed inventory — Open Water in bulk, pricier ones (Advanced ~10, Divemaster) as-needed.
- Codes are stored in Lightspeed as an **inventory item with serial numbers** (R-Series → Inventory → item → serial numbers). Each shows available vs. taken, and **which customer each taken code belongs to**.
- When someone buys a class, staff **create the customer in Lightspeed** (if new) and record the **course SKU** (e.g. "open water tuition") plus a miscellaneous line for the RentItBiz payment. The e-learning code is one-time-use and tied to the customer's name — that linkage is how the shop re-sends a lost code.

### What Top Rock will automate

Three things must happen in Lightspeed on a booking:

- **Create / match the customer** (de-dupe — "is this an existing customer?").
- **Mark the course purchased** — tie it to the existing course SKU so Lightspeed knows the customer bought that course.
- **Pull an e-learning code from inventory and assign it to the customer** automatically, so the code can go out with the onboarding email; update inventory so it isn't reused, with **error handling** if codes run out.

Top Rock also offered to help **manage the code-loading process** — paste codes into their system and push them to Lightspeed — to ease the one-by-one copy-paste.

### Who owns the codes — decided

**Lightspeed should own the e-learning code management**, not Top Rock's system. The shop sometimes issues a code manually for a walk-in/phone customer who never goes through the booking system (and private/semi-private classes are scheduled off-system entirely). So Top Rock's system will **read from Lightspeed** to know which codes are used, rather than being the source of truth. Private/semi-private bookings won't be handled by the online flow at all.

## 6. Trips & the two bank accounts

*Trips are a separate legal entity with a separate bank account; trip money must stay separate from scuba/retail money. The shop deferred solving trip payments in this first iteration.*

- Trips are listed on **RentItBiz**, but very few people pay online there (~1 in 50) — and only the **$250/$500 deposit**. After that, the shop contacts the customer and takes payment on a **Square device** (often keeping a card on file with consent). Square is used *only* for trips and for Pacific Scuba.
- Why Square and not Lightspeed: Lightspeed can route to **only one bank account**, and the shop needs trip money in a different account. Deposits paid via RentItBiz land in the scuba/Lightspeed account, then get manually transferred to travel — a headache when deposits owed to resorts run into the tens of thousands (the Fiji final was ~$78–80k).
- Some travel pages link to a flyer/PDF instead of an "add to cart" page — the shop didn't realize a couple were misrouted to the flyer only.
- **Ideal future state:** classes route to one bank account, trips to another. Top Rock believes **Stripe** can support two destinations and just needs the flow to know there are two accounts.

**Defer:** don't solve trip payments / the two-account split in this iteration — "too many things to solve at once." Ship the class-booking flow first and link to the existing trip process for now.

## 7. Contact form leads

*Raised by the shop as a separate website issue: leads from the current contact form have dried up entirely.*

- The current site (about a year old) had a working contact form, but the shop was getting **20–30 spam submissions a day**. After a reCAPTCHA "I'm not a robot" check was added, **spam stopped — but so did all real submissions** (now zero).
- Customers are saying "I sent you a contact us and we're not getting them." The shop wants a reliable contact form rebuilt on **both the Scuba Dive and Pacific sides**.
- **Delivery:** the shop prefers submissions **emailed** to them (didn't realize storing them in the admin panel was also an option) — Top Rock can do both (email + organize in admin).

## Decisions made

| Topic | Decision |
| --- | --- |
| Design direction | Go with the merged version of Alex's two favorites — lighter, more vibrant "water" feel. |
| Booking flow | Ship the custom course-booking flow first; add payment afterward. Iterate via slow real-world testing before going live. |
| Medical questionnaire | Make it conditional — skip the sign-off section when all answers are "no"; pop a physician-sign-off heads-up + printable PDF when triggered; collect it before arrival. |
| Age enforcement | Keep hard age validation per participant in the booking flow. |
| Month filter | Add a month toggle/filter on top of the cohort list to avoid long scrolling. |
| E-learning codes | Lightspeed owns code management (handles off-system / walk-in issuance). Top Rock's system reads Lightspeed and automates create-customer, mark-course-SKU, and pull/assign-code. |
| Lightspeed safety | Test against a clearly-labeled `TEST` customer, `TEST` e-learning code and fake course — never touch real data. |
| Trips | Deferred this iteration; keep the existing RentItBiz/Square trip process and link to it for now. |
| Rollout cadence | One thing at a time: nail the booking flow → add payments → tie in Lightspeed → then trips. |

## Open questions

**Open — Does the reformatted (non-PDF-overlay) paperwork hold up legally if the wording is identical but the format differs?**
Unknown — the shop will verify whether only the language matters. If so, Top Rock's clean rebuild is fine; otherwise someone reviews for missing wording to add.

**Open — Which exact medical questions trigger a physician sign-off, and is the physician page already on the website?**
Shop to confirm the trigger questions; owner will check the site and send a digital copy if it's not already there.

**Open — Which documents should be digitized vs. kept printable for the student folder?**
Shop to specify — refresher/snorkel/scuba-discovery can stay digital; some forms still need to print for the folder.

**Open — Can Stripe route class payments and trip payments to two different bank accounts?**
Top Rock believes yes; to be confirmed when payments are built. Deferred until after the booking flow ships.

**Resolved — Should Top Rock's system or Lightspeed own e-learning code management?**
Lightspeed — it must stay the source of truth because codes get issued off-system (walk-ins/phone). The new system reads from it.

**Resolved — How should contact-form submissions be delivered?**
Emailed to the shop (their preference), with the option to also organize them in the admin panel.

## Cadence going forward

Ship and iterate on the **booking flow** until the shop is comfortable, testing slowly a handful of times. *Then* add Stripe payments, *then* tie in the Lightspeed customer/SKU/code automation, *then* tackle trips and the two-bank-account split as a later phase.

---

*Compiled from the May 21, 2026 meeting transcript — corrections welcome. References: prior session notes & the project Drive folder.*
