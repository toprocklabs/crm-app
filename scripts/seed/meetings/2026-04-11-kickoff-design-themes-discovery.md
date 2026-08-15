## Participants

- **Austin (Speaker A)** — Top Rock — dev, driving the demo & discovery
- **Partner (Speaker B)** — Top Rock — SaaS background, pricing & integrations
- **Kate (Speaker C)** — Client — runs back-end scheduling & Lightspeed
- **Owner (Speaker D)** — Client — shop owner; left early; owns Pacific site request
- **Staff (Speaker E)** — Client — front-desk staff; pushing for automation

External names referenced: **Glenn** (previous owner of Pacific Scuba Repair), the **guy in California** who built/hosts Glenn's old Pacific site for free, **SDI/TDI** (e-learning code supplier & cert agency), **Lightspeed** (POS — R series + E series), **RentItBiz** (booking/rental software, originally for ski/bike shops). The owner's **grandma** handles accounting.

## 1. Design theme directions

*Top Rock opened by showing several custom website mockups as starting points. These are directions, not the final build — the shop picks the one they like and Top Rock builds it out with their real content.*

- Themes shown: an **adventure** theme, a **trusted** theme, a **dark / bold** theme, a **clean** theme, plus one more mockup. The shop's reaction to the clean one: *"Super clean… that's awesome."*
- Copy is placeholder — it will be rewritten to fit the shop's voice once a direction is chosen.
- Top Rock will **send all the mockups over** so the shop can review them at their own pace and decide.
- Selling point raised: because the sites are custom-built (not WordPress), if web design trends shift later, they can **reskin the site** without being locked into rigid template sections.

## 2. How Top Rock works (context for the shop)

*Top Rock framed who they are so the shop understands the value and the cost model.*

- Specialty is **custom solutions**, not just websites — the website is the clearest first deliverable, then they look for other ways to optimize the business as they understand it better.
- Both founders come from **SaaS / software backgrounds** (current day jobs). They previously ran a four-person mobile-dev shop in LA that had to charge ~$30k per project because of full-time headcount.
- Now they **leverage AI agents** to build faster and cheaper — most of the implementation cost is AI tokens. Their pitch: small businesses like a dive shop normally never get access to this kind of custom software at a reasonable cost.

## 3. Course onboarding pain (the headline problem)

*When someone signs up for a class, the shop has to manually send a long onboarding email containing the e-learning code, medical form, and waivers — and customers often ignore it until the day of the class.*

- Today the onboarding email is sent **manually by an employee** — it is not automatic. Customers who sign up Saturday night don't hear back until Monday morning.
- The email is effectively an **onboarding checklist**: "thanks for signing up, here's your e-learning code, step 1 medical, step 2 sign this waiver, print these, start your e-learning, here's the gear you'll need."
- **Every class has its own Gmail template** (Scuba Discovery, Refresher, Rescue, Nitrox, Open Water, Advanced…) and the employee must paste in the class schedule by hand.
- Real failure mode raised: a scuba-discovery customer showed up 15 minutes late not knowing he needed a medical form, because he only opened the email that morning — the shop had to consider turning him away.
- Customers frequently **call to ask "what do I do next / where's my code?"** — adding more manual load.

### What the shop wants

- Make signing the medical + waivers **part of the checkout flow** so it happens in the moment of purchase, plus a follow-up email/text as backup.
- The shop and the customer should both **get a copy / confirmation** (time- and date-stamped) of what was signed.
- Visibility into **who hasn't submitted forms**, so staff can call a week ahead instead of discovering it at the pool.
- Possibly **text-message** reminders too, since many customers don't check email.

## 4. The current signup workflow (walked live)

*Kate walked through the actual end-to-end process for a new online signup. It is a multi-system, multi-step relay done by hand — roughly 5–10 minutes per signup if uninterrupted, and only ~8 of every ~10 signups are digital.*

### The steps, as performed

- RentItBiz emails the shop when someone books; staff work the inbox **oldest-first** on Monday morning.
- Check Lightspeed for the customer; if new, copy their name / phone / email out of RentItBiz and **create the customer in Lightspeed**.
- Run a **mock sale in Lightspeed** to pull and assign a serialized **e-learning code** to that customer.
- Open **Google Calendar** and add the person to the right class on the right date (the roster lives only in Calendar).
- Open the correct **Gmail class template**, paste in the e-learning code and the class schedule, and send — once per person (a 2-person reservation = doing it all twice, two emails).
- Constantly **cross-reference** to catch mistakes — e.g. a sale with two e-learning codes but only one on the email, to confirm both people got what they needed.

Staff are fast at it ("they've been doing it forever") but interruptions — phones ringing, customers walking in — cause missed steps. *"It feels like there's a lot of middle things that could just be eliminated."*

## 5. RentItBiz & class management

*RentItBiz is the customer-facing booking site for classes (and the rental tracker). It was originally built for ski / mountain-bike shops and adapted for scuba — and it glitches.*

- Kate manages every class in RentItBiz manually: creating classes, setting participant caps, and updating which classes are **visible online** (checked vs. archived).
- **"Class sold out" is manual** — there's no auto-flag. Staff have to type "class sold out" into the title, subtitle, and description in three places, every time.
- Decision in-meeting: don't just hide sold-out classes — **keep them visible but marked sold out**. Removing them makes it look like the shop has no classes; showing them signals demand and supports wait-lists / last-minute reopenings.
- Pain point: when a customer browses classes, RentItBiz **takes them to an external site** and they can't easily get back to the shop's own website to buy gear.
- Rentals were **removed from the public website** because online rental was causing gear-rental issues; rentals are now in-person only.

## 6. Lightspeed as the source of truth

*Lightspeed is the shop's internal database and POS — the system everything must reconcile back to. The shop loves it and wants to keep it.*

- Lightspeed holds **inventory, online sales, all product SKUs, customer records, and the e-learning codes**. It's where they verify "did this person actually sign up / pay."
- They run Lightspeed's **R series** (retail) plus the **E series** (e-commerce, paid extra) — online purchases record back to in-store staff.
- **RentItBiz and Lightspeed are not connected.** A RentItBiz signup does not flow to Lightspeed — staff key the customer in by hand.
- Revenue ends up in **two places that can't be reconciled**: class sales coded as "RentItBiz" inside Lightspeed (logged as an *other payment* type) plus separate in-person Lightspeed sales — which confuses the accountant (the owner's grandma).
- The shop asked Lightspeed about handling rentals on their SKUs; Lightspeed said it's a different platform and would contract it out — "so what's the point."

### The big idea Top Rock floated

Make Lightspeed the single source of truth and have the new system **talk to Lightspeed via its API** — pull/create the customer, run the sale, pull and assign the e-learning code, and update inventory automatically. Top Rock even floated **not modeling "customer" in the new system at all** and always referring back to Lightspeed. The shop's ideal state: *"shop, classes, rentals — all in Lightspeed."*

## 7. SDI e-learning codes

*E-learning codes are the linchpin of the whole flow — and the reason every class signup currently has to round-trip through Lightspeed.*

- The owner buys codes from the **SDI portal** on an as-needed basis (Open Water in bulk; Advanced ~10; Divemaster only when needed because they're expensive) and **copy-pastes each serialized code one-by-one** into Lightspeed inventory.
- Codes are tracked as **serialized SKUs** in Lightspeed so the shop can reconcile exactly how many they have (e.g. "we have 11 codes" must match 11 physically countable codes). A missing code triggers an investigation.
- On sale, a code is assigned to the customer and stored on their Lightspeed record — retrievable later (e.g. when a customer says "I lost my code, resend it").

### The three things the new system must do

Agreed test scope, to be validated against a safe sandbox: (1) **create the customer** in Lightspeed, (2) **assign the paid-for course**, and (3) **pull/assign an e-learning code** and decrement inventory automatically — with **error handling** if a code is out of stock and an **admin verify step** for staff to double-check inventory alignment.

## 8. Rentals & the checkout counter

*Rentals are tracked in RentItBiz but paid through Lightspeed. Rentals are deferred for now, but the owner sketched a future improvement.*

- Rental gear is scanned in/out on a **Surface Pro with a barcode scanner** using stickered SKU numbers. Color codes: green = out, red = returned, yellow = late. RentItBiz also tracks maintenance/service history and full rental history per item and per customer.
- Rentals don't drive much revenue — most rentals are **free for open-water students**, and a $25 BC rental would need ~16 rentals to recoup a $400 purchase. **Gear purchases** are the real money; **classes are the funnel** that gets people in the door.
- Current friction: staff scan rentals in RentItBiz at the door, then **walk customers to a separate Lightspeed POS** to actually charge them — two point-of-sale systems for one transaction, right where returning classes pile up gear by the entrance.
- Desired future state: a **dedicated rental checkout station** (e.g. a desktop on the side table) with a **card reader** that scans gear, computes days × cost, and takes the tap payment in one place — away from the main retail counter.

**Defer:** don't tackle rentals in the first iteration — but the long-term goal is to **retire RentItBiz entirely** to save its cost.

## 9. Pacific Scuba Repair website

*Before leaving, the owner flagged his own top priority: a new website for Pacific Scuba Repair, the regulator-repair business, which is going more national with advertising.*

- The owner doesn't want a national ad to send people to a dated old site that makes them doubt "is my equipment coming back to me." Wants something professional; low maintenance, only occasional changes.
- **SEO is currently fantastic** — random repair leads come in from across the country (e.g. Tennessee, the East Coast). Protecting that discoverability is a hard requirement.
- Top Rock raised **AI optimization** as the modern complement to SEO — embedding a text file in the site so AI assistants can read and refer the business.
- **Domain / access blocker:** the old Pacific site was built and hosted for free by "some guy in California" for the previous owner (**Glenn**), who is slow to respond ("when I get to it"). Top Rock needs the **domain login** to repoint DNS to the new build (same URL), and ideally the **old site files**.
- **Lost leads:** the old contact form was routing to nowhere — a spreadsheet of **100+ people** who tried to contact the shop was never received. The shop wants to stop missing these.

## 10. Pricing & scope

*Top Rock gave rough, transparent numbers and described how they package work.*

- **Mock website: ~$500** (intentionally low), with a **$250 deposit** to start. A full **statement of work** will lay out everything to be built and delivered.
- **Replacing RentItBiz completely: ~$100–150/mo** — meant to come in under what RentItBiz costs today, and ideally to deliver far more value than RentItBiz currently does.
- **Add-ons** (digital signing/waivers, the email-automation/streamlining piece, text messaging, etc.) will carry separate costs depending on scope, reflected in monthly pricing.
- Cost transparency: most implementation cost is AI tokens, which is why custom work is now affordable for a small shop.

## Decisions made

| Topic | Decision |
| --- | --- |
| Sequencing | Chunk the problems. Take over the **class / scheduling flow first** and replace RentItBiz for courses; decide what to tackle next afterward. |
| Source of truth | **Keep Lightspeed** as the system of record; the new system integrates via Lightspeed's API rather than replacing it. |
| Onboarding | Move waiver/medical signing into **checkout** and **automate** the onboarding email (with confirmation copies to shop + customer); explore SMS. |
| Sold-out classes | Keep sold-out classes **visible but flagged** (auto), not hidden — signals demand & supports wait-lists. |
| Rentals | **Deferred** to a later phase; long-term goal is to retire RentItBiz entirely. |
| E-learning codes | Automate create-customer / assign-course / pull-and-assign-code with error handling + an admin verify step; prototype in a labeled Lightspeed sandbox. |
| Pacific site | Build a new Pacific Scuba Repair site (owner's priority); protect SEO, add AI optimization; same URL via DNS repoint once domain access is secured. |
| Pricing | ~$500 mock site ($250 deposit) + ~$100–150/mo to replace RentItBiz; add-ons scoped separately in a forthcoming statement of work. |

## Open questions

**Open — Does Lightspeed expose an API that supports create-customer, run-sale, and pull/assign serialized e-learning codes?**
Top Rock to investigate; the shop will supply their Lightspeed rep and API access.

**Open — Can the new system avoid modeling "customer" at all and always point back to Lightspeed?**
Idea floated; feasibility depends on the API. To be explored in the sandbox.

**Open — Will the California contact hand over the Pacific domain login (and ideally the old site files)?**
The shop is working on it; he's slow ("when I get to it"). Domain access is the blocker to repointing DNS.

**Open — What's in the 100+ lost-leads contact spreadsheet, and how do we recover those?**
Old Pacific contact form routed nowhere; shop wants to not miss those leads. Recovery TBD.

**Resolved — Tackle everything (courses + rentals) at once?**
No — courses/scheduling first, rentals deferred.

**Resolved — Hide sold-out classes from the public site?**
No — keep them visible but auto-flagged as sold out.

## Cadence going forward

One thing at a time: lock a design theme & rebuild the main site, take over the course/scheduling flow off RentItBiz with Lightspeed as the source of truth, streamline onboarding — *then* circle back to rentals and retire RentItBiz, and ship the Pacific Scuba Repair site in parallel.

---

*Compiled from the April 11, 2026 meeting transcript — corrections welcome. This was the kickoff / discovery session.*
