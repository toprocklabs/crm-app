## Participants

- **Kate (Speaker B)** — Client — co-owner; hands-on admin, homework owner
- **Lola (Speaker D)** — Client — newer hire (~few months); in training; third-grade teacher
- **Austin (Speaker C)** — toprock — dev; drove the technical walkthrough
- **Partner (Speaker A)** — toprock — integrations, sales & people-finding; led domain recovery

External names referenced: **Eric** (co-owner; texting Jeff), **Glenn** (previous owner — the 2FA goes to his old, defunct phone), **Jeff / Geoff** (the IT person who controls the Google account & domain recovery). *Speaker attribution is inferred from context — Speaker A addresses "Austin," who answers as Speaker C, so C = Austin, A = the partner.*

## 1. Classes vs. cohorts — the core model

*Where Kate had gotten stumped. Once this clicked, most of the admin made sense: you don't rebuild a course every time you run it — you add a new cohort to an existing class.*

- **Class** — the reusable **course definition**: title, description, image, prerequisites, age limits, tags, tuition/e-learning links. You set it up once.
- **Cohort** — a specific **dated session / group** of that class: "this class, on these dates." A student signs up for a class and gets assigned to a cohort. It's a first-pass name — *if "cohort" doesn't feel right, it can be renamed to anything.*

The shape: **create the class once** ("Open Water") → **add a cohort** (just set the dates) → **duplicate for the next dates** (copy & change dates) → **students book and get placed** (movable between cohorts anytime).

### What this changes for the workflow

- **Build once, schedule many.** Create "Open Water" as a class, then add each new run as a cohort — no re-entering all the course info each time.
- **Cohorts can be added two ways** — inside the class (there's a *Cohorts* section on the class), or from the standalone *Cohorts* area (add cohort → pick class). Kate wouldn't have thought to look in Cohorts, so this was a useful clarification.
- **Duplicate to save time.** If you like how a cohort is set up, duplicate it and just change the dates.
- **Students are movable.** People can be reassigned between cohorts — that flexibility is built in.
- **Kate's plan:** add all the classes and all the cohorts (mainly cohorts) now; if go-live slips and a date passes, just remove that cohort.

## 2. Course-creation feedback (Kate's punch-list)

*Kate had actually tried to add a class and hit friction — that friction became a clean list of UX fixes for the team.*

| Field / behavior | What happened / the ask | Action |
| --- | --- | --- |
| Image upload | Currently you add the course image via a URL — Kate got stumped, and Lola helped her pull one from a folder. Ask: allow a straight **file upload** during course creation. | Dev |
| Alt text | Was **required** and blocked saving/publishing. Team typed a placeholder to get past it. Decision: make it **optional**. | Dev |
| Required vs. optional | Make non-essential fields optional; clearly **mark required fields with a star** (★) and label the rest "optional" — Kate wants it to read like a checklist. | Dev |
| Placeholders | Add placeholder text/defaults for optional fields (e.g. the backdrop image) so a blank isn't confusing. | Dev |
| Order number | Controls the order courses appear on the site — **lower numbers show first**. Set a course to `1` to put it at the top. | Explained |
| Tags | Optional. Help SEO/organization, and enable **filters** on the public classes page (e.g. non-certified, advanced, by age). "The limit is unlimited" on customization. | Explained |
| Prereq / age | Prerequisite, minimum age, maximum age fields available on the class. | Explained |
| Draft vs. publish | A course sits in **draft** (not shown on the site) until published; publish requires all mandatory fields complete. | Explained |
| Description length | Kate's first descriptions were too long and the card truncates — full detail lives on the course detail page. Good feedback; keep card blurbs short. | Noted |

Framing from the team: this is all first-pass — anything can be renamed, made optional, filtered, or re-laid-out. "Be brutally honest; we won't take it personal."

## 3. Lightspeed tuition + e-learning linking

*During course creation you can wire the course straight to Lightspeed so the two systems "talk to each other."*

- **Pick tuition item:** search the **SKU in Lightspeed** and link the course to that tuition item, so it auto-syncs.
- **Link the e-learning code/item:** the course can also be tied to its e-learning item, which lets the system track inventory.
- Result: when a customer books and pays, it knows what to update in Lightspeed automatically — no manual entry.
- **Snag during the demo:** the SKU picker errored — the **Lightspeed token needs renewing/confirming**. Austin to verify the token so search works.

Deeper mechanics of the e-learning-code flow are in §8 below — Kate flagged this as her "scariest part" (keeping codes organized).

## 4. Booking flow & waivers / signatures

*Kate is comfortable with the booking flow and has made changes to it. The team's ask: get more eyes on it (run Lola through it) and do a real end-to-end test.*

### Waivers & signatures

- Signed waivers are captured in the admin — each signature can be **printed or downloaded**. Kate prefers **download** wherever possible and saves them to a file; if a customer needs a paper copy, they print and bring it.
- **Same waivers for every course** — there's no case where a customer signs different documents based on which course they take, so it stays simple (waivers are on for all courses).
- **Returning customers always re-sign** for each new course they take.
- **Retention:** signatures are retained ~**90 days** in the admin; a quick "export" can be built later for bulk download.
- **Admin PIN:** the admin (where signatures/forms live) sits behind a PIN. Austin to send/set the admin PIN link; it's the same PIN, and Kate needs to save it.

## 5. Website launch & the mobile bug

*The next big push is launching the full public website. The build is close — it mainly needs a content review from the shop.*

### Copy & content review

- Go through all the site copy/text and layout and flag anything to change — the team is "not creative/precious about it," wants exactly what the shop wants.
- Send **photos** (team, instructors, facility) to make it feel like the shop. The site should match the (very nice) physical facility so it feels seamless.
- The **shop** links still point to Lightspeed — that experience stays the same. Once copy is dialed, they're ready to launch courses off the new site.
- **Reuse existing content:** the shop already sent all their updates/changes to their current **HostGator** site. Rather than redo it, Kate will hand over the HostGator login so the team can copy/pull content from there. Any extra docs/copy about the business help too — more material = more the team can leverage AI to customize.

### Mobile bug (caught by Lola) — Bug

On a phone, the **landing-page hero/backdrop is blocked out** — you can't see the background or the "Dive Deep" text on mobile the way you do on desktop. Fix: make the mobile landing page show the hero properly (blur/adjust so "Dive Deep" and the backdrop render). Good catch.

## 6. Pacific Scuba domain / Google account recovery — Urgent

*Continuing the June 17 thread — this session nailed down the exact recovery mechanics for the Pacific Google account (which gates the website/domain).*

### The blocker

- The shop has the account username/password, but there's **two-factor authentication** on it. The 2FA prompt goes to **Glenn's old phone** — which he no longer has, so he can't approve logins.
- **Jeff / Geoff** is the IT person who actually controls things (not the previous owner). He's hard to reach — "very busy, very crabby" — and updates on his end were always required, which was the original problem.
- Glenn is friendly and "on our side," wanting Jeff to help hand it off.

### The recovery path (mapped live)

- Log into the Pacific Google account (password confirmed on-site).
- At the 2FA prompt, click **"Try another way."**
- Choose the option to send a **verification code to Jeff's personal recovery email** — which he *can* access (his phone number isn't shown/usable).
- Get Jeff by his computer to read back the code (**valid ~10 minutes**), and you're in.
- **Immediately change the recovery email/phone to the shop's own** so they control the account going forward.

Status: Kate **texted Jeff** (Eric advised texting since he's busy). No response yet — the plan is to catch him when he's at a computer (today or tomorrow) and send the 10-minute code. They can leave the login screen up while waiting.

### Two related recommendations

- **Add the Pacific Google account to Kate's own Gmail** ("Add another account") once in, so it's saved and accessible without going through Jeff again.
- **Move off the generic Gmail to a domain email** — e.g. `info@pacificscubarepair.com` via Google Workspace (~$4/mo). More professional and reassuring for customers shipping expensive gear (a random Gmail can look sketchy). *Not urgent* — flagged for the radar. The shop already owns the `pacificscubarepair.com` domain (pending access transfer). Once everything's migrated off the old Gmail, that account can be retired.

## 7. Pacific check-in form — one tweak

*Reviewing the Pacific intake/check-in form (scoped June 17). It's basically done — Kate had one change she'd flagged earlier.*

- **Remove the "Do you authorize us to replace or fix? (Yes/No)" box.** It's redundant: the Yes/No service selections plus the **signature** already serve as the authorization.
- Everything else on the form looks good.

## 8. Stripe, auto-emails & the e-learning-code deep-dive

### Stripe

- Setup is largely handled. Kate has been **saving a few Stripe emails** requesting a valid tax ID and similar — she provided one. Austin: nothing needed from the shop's side beyond that; the team will confirm the remaining logistics.

### Auto-emails on signup

- Confirmation/auto-emails when someone signs up for a course still need to be **set up**. Austin to double-check and configure.

### E-learning codes (Kate's "scariest part")

How the code flow works inside Lightspeed, so codes stay organized and books stay clean:

- Today the shop sells course tuition as a **non-inventory item** in Lightspeed (e.g. "SDI Open Water tuition").
- New flow: the course is **tied to that Lightspeed tuition item** and to the **e-learning code (tracked as inventory)**. On a sale, the system creates/matches the customer, records the sale, **decrements the e-learning inventory lot**, and **ties the code to the customer** — automating what Kate did by hand.
- If two people sign up, it pulls two codes; the course is connected to the right e-learning item each time.
- **Kate's preference:** stick with the Lightspeed-linked flow — it gives more control over the codes — rather than SDI's newer direct-issue option, *unless* the SDI way proves smoother. Keep **Lightspeed as the single source of truth** so the books all pull from one place.
- **Verification:** the team will **audit the first few real sales** to confirm the code, inventory, and customer all book correctly. Austin wants to walk the whole flow with Kate over **Zoom using a test** so she sees it hit Lightspeed live.

## 9. Go-live plan

*"Go live" here means turning on real payments for a handful of customers — not a full domain cutover. Low-risk, real-world proof before the big switch.*

The sequence: **turn on real Stripe** for a few (even 3) customers → **in-person guinea pigs** (RentItBiz stays up in parallel) → **verify end-to-end** (Stripe charged → Lightspeed) → **transfer the domain** for the full public launch.

- **Guinea pigs:** use in-person walk-ins as the first real payments. Kate's rough mix — **~60% online, ~30% in person, ~10% phone** — so there are plenty of in-person chances.
- **Scuba Discovery** runs **one Saturday a month, 9–11am**, and people often sign up right after — a good moment for the team to **swing by and watch real customers** book/pay on a laptop.
- **Payments now run through Stripe** (Stripe takes the money), but everything is still **logged in Lightspeed**. RentItBiz doesn't charge money anyway, so nothing is lost by taking those payments through the new system.
- Once a few real payments succeed and are verified, **shift the domain** to the new site for the full launch.
- Austin also offered to **show Kate the full back-end flow** (how it all connects) once — optional, for her understanding, not required to operate it.

## 10. Staff onboarding aids

- Kate is training Lola gradually (and had a staff member leave), so onboarding matters. The team offered to build an easy **laminated one-pager / printout** of the tech + admin process so new folks have a reference.
- Do it **once the admin experience is finalized** — no point documenting screens that will still change.

## Decisions made

| Topic | Decision |
| --- | --- |
| Classes vs. cohorts | Keep the model: build a class once, add/duplicate cohorts per set of dates. Kate will add all classes + cohorts now; remove cohorts whose dates pass before launch. "Cohort" name can change if desired. |
| Course-creation fields | Make alt text and non-essential fields optional; mark required fields with a ★ and label the rest "optional"; add placeholders. Build an easier image **file upload**. |
| Waivers | Same waivers for every course; returning customers always re-sign per course; ~90-day retention; download preferred over print. |
| Website | Launch is the next milestone. Shop reviews copy + sends photos; team pulls existing content from HostGator. Fix the mobile hero bug first. |
| Pacific domain | Recover the Google account via "Try another way" → code to Jeff's recovery email → then change recovery to the shop's own. Add the account to Kate's Gmail once in. |
| Domain email | Move to `info@pacificscubarepair.com` (Workspace, ~$4/mo) eventually — flagged, not urgent. |
| Pacific check-in form | Remove the redundant "authorize repair" Yes/No box — signature + selections already authorize. |
| E-learning codes | Keep the Lightspeed-linked flow (more control) unless SDI-direct proves smoother; Lightspeed stays the single source of truth; audit the first real sales. |
| Go-live | Flip real Stripe payments for a few in-person guinea pigs (RentItBiz runs in parallel), verify Stripe→Lightspeed, then transfer the domain. |

## Open questions

**Open — Can we get Jeff to a computer to read the 10-minute verification code?**
Pending — Kate texted him; waiting for a reply. Once he's by his computer, run the "Try another way" → recovery-email flow.

**Open — What's the target go-live date / first live cohort?**
To be set. Likely tied to a Saturday Scuba Discovery (9–11am) so the team can watch in-person payments. Kate also needs to add Sept–Dec cohorts.

**Open — Lightspeed-linked e-learning codes vs. SDI direct-issue?**
Leaning Lightspeed (more control, one source of truth); will stick with it unless the SDI way proves noticeably smoother in practice.

**Resolved — Do different courses need different waivers?**
No — same signatures for every course, including returning customers. Keeps it simple.

**Resolved — Do we recreate a course every time we run it?**
No — create the class once, then add a cohort (dates) for each run; duplicate to save time.

**Resolved — Pacific check-in form, anything missing?**
Just remove the redundant authorization box; the rest is good.

## Cadence going forward

Home stretch: finish the admin UX fixes and load the classes/cohorts, review the website copy and fix the mobile hero, recover the Pacific account, then **go live with real payments for a few customers** before transferring the domain. E-learning codes get walked through live so Kate is comfortable before launch.

---

*Compiled from the July 15, 2026 in-person working session — corrections welcome. Speaker attribution inferred from context. References: prior session notes in the project Drive folder.*
