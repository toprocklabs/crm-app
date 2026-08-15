## Participants

- **Kate (Speaker B)** — Client — co-owner; hands-on admin, homework owner
- **Staff (Speaker D)** — Client — shop staff (likely Lola); rentals + house/pet-sat over the trip
- **Austin (Speaker C)** — toprock — dev; drove the DNS cutover & admin fixes
- **Justin / partner (Speaker A)** — toprock — integrations, sales & people-finding

External / referenced: **Jeff** (IT in California — controls the Pacific Google account), **Preston** (instructor; holds the phone with the 2FA code), **Glenn** (sold the business; shut things down), **Eric** (Kate's co-owner/husband), plus instructors **Ivan** & **Greg** (canceled/active classes). *Speaker attribution is inferred and the two toprock names (Austin/Justin) are best-guess from context — the transcript is garbled in spots.*

## 1. The website goes live — Shipped

*The shop's existing site was down (malware on the old HostGator site), so leads were landing nowhere. The move: get the new site live today without waiting for scheduling to be finished.*

- **What went live:** the new Vercel-built marketing site, now served at the real domain `scubadiveriverton.com`.
- **Courses still point to RentItBiz** for now — the site's "Courses" link redirects to the existing RentItBiz scheduling so customers can still book while the new scheduling is tested. Just a redirect; nothing else changes.
- The **malware is on the old HostGator site, not RentItBiz** — so redirecting the RentItBiz link forward is safe.
- Rationale: "just so the website isn't down any longer." Ship the front door now, finish the scheduling engine behind it.

Cutover flow: **Domain @ HostGator** (keep registrar only) → **point DNS at Vercel** (A + CNAME today) → **new site LIVE** (Courses → RentItBiz for now) → **later, swap in scheduling** once staging is ready.

By end of meeting the site loaded on phones; some desktops still showed the old cache / a redirect loop (see §3). Expected to resolve as DNS propagates.

## 2. Two environments: live vs. staging

*To ship the front-end fast without freezing scheduling work, there are now two separate sites. Kate should always glance at the domain to know which one she's on.*

- **Live (production)** — the real domain, `scubadiveriverton.com`. This is what customers see. Courses currently redirect to RentItBiz. Its own admin.
- **Staging (test)** — a separate Vercel URL (the `…-staging….vercel.app` one Austin emailed Kate). This is where **all scheduling editing happens** until it's ready to promote to live. Its own admin.

Details:

- Austin **emailed Kate the new staging URL** (to her `…@gmail.com`, which she checks more than the domain email).
- **Kate to delete her old bookmarked URLs** — the previous testing URL no longer works after the change.
- The class-manager "domain" field in admin was pointed to the new staging URL so edits render against the right site.
- The only thing that's meaningfully "live" to edit right now is **Trips**; courses aren't transferred yet, so scheduling edits belong on staging.

## 3. DNS cutover & HostGator cost cleanup

### The cutover (done live)

- **Keep the domain at HostGator** as the registrar; host everything else on Vercel.
- Records set: **A record → `216.150.1.1`**, **CNAME `www` → the Vercel value** (Austin forwarded the exact value to Kate's Gmail). Production domain set to `scubadiveriverton.com` in Vercel.
- **Propagation hiccups:** worked on phones, not on some desktops; saw an SSL "not secure" / generating-certificate state and a Vercel **redirect loop (308)** on the bare vs. `www` host. Left to settle over time; plan to re-check and, if needed, delete & re-add the `www` CNAME.

### Cancel the HostGator add-ons

- Kate wants a **list of everything HostGator bills** so she can cancel what's not needed. Keep only the domain.
- Candidates to cancel: **domain privacy, website builder, the "Hatchling" shared-hosting plan**, and other add-ons ("they told me I needed it, so I bought it").
- **Wait until things stabilize** before cancelling, then consolidate to save cost.

## 4. Scheduling admin bug fixes

*Kate had been diligently loading classes/cohorts and hit a run of bugs. Several were already fixed on the updated (staging) site; the rest are logged.*

| Bug | Detail | Status |
| --- | --- | --- |
| Session times | Editing times individually and saving produced wrong times (a 4-hour class showing e.g. 3 AM). | Fixed |
| Classroom/pool location | Setting classroom vs. pool per session reverted them **all** back to "classroom" on save. | Fixed |
| Class edits not reflecting | Edits to class info weren't showing on the site (Kate had been editing the old URL). Now edits render on the staging site. | Fixed |
| Duplicated description | Course pages showed a huge **doubled paragraph**. Short description should be at top, full description at bottom — full was duplicating. | Dev — investigate |
| Past cohorts still showing | Cohorts whose date had passed still appeared to customers; Kate was manually unchecking boxes to hide them. | Dev — auto-hide |
| Canceled cohorts still showing | Canceled classes (e.g. Ivan's) still appeared on the site even after marking canceled. | Dev — default open-only |

### Decisions on cohort visibility

- **Auto-hide past-dated cohorts** — once a cohort's date passes, drop it from the website entirely (not just hidden from customers). Kate would rather it be automated than remember to toggle it.
- **Default to showing only "open"/active cohorts** on the public site. Nothing gets deleted — canceled/past stay visible in the admin for the shop's own records (hard-delete of cohorts isn't available yet; "cancel" is the mechanism).
- Kate is happy to **see all cohorts listed together** on the site (customers get the full picture); a month filter could come later.

## 5. Booking flow — the reserve button

*A dead-end in the flow: on a course page, clicking a cohort shows it, but "Reserve a spot" just loops back to the same screen instead of advancing to the headcount step.*

- **Fix:** put "Reserve a spot" on the cohort itself, so clicking a cohort takes the customer **straight to the count / next step** — remove the extra intermediate screen and its redundant reserve button.
- Rationale: they aren't forcing a cohort pick on that first page, so the extra hop adds nothing. Selecting a cohort should go directly to headcount → contact.
- The headcount and contact steps themselves look good.

## 6. Migrating existing RentItBiz registrations

*Kate's concern: some classes are already full in RentItBiz (e.g. Aug 18). At go-live, how do already-registered students move over without getting re-registration emails ("why am I registering again?").*

- **toprock does the migration on the back end** at go-live — the shop won't hand-move anyone. Needs **RentItBiz login access**.
- Only migrate **current active classes**, not all historical data — **Lightspeed stays the center / source of truth** for past records.
- Austin will add a **manual "add people to a cohort"** function in the admin, so Kate can quietly add someone on the back end without firing notifications.

## 7. Cert-card & signup tweaks

- **Cert-card number:** on certification signups, add a **"I don't have it on me — will provide later"** checkbox so a missing cert-card number doesn't stop someone from signing up. The shop can then see who still owes a number. (Many people have to go find their card.)

## 8. Service page — linking Scuba Dive & Pacific

*Many Scuba Dive customers don't know the shop does in-house regulator service (through Pacific). Kate wants a Service tab so people know they can bring gear in.*

- **Decision:** Scuba Dive advertises service for **local** customers under its own brand (a "Service" tab describing what they do); **Pacific** stays for out-of-state / shipped-in service. Keep the two businesses separate.
- **Why not just link out to Pacific:** a hard hand-off to a different brand can lose trust (customers might think service is being outsourced). Keeping it coherent under Scuba Dive reads better; Pacific will also eventually move to its own location.
- How they ring it up today matches this: Scuba Dive customers are charged under Scuba Dive; walk-ins who found them via Pacific are charged under Pacific.
- Pull the **old Service page content from HostGator** (the shop had one, with a contact form) and rebuild it — see §9 for the form.
- Nice anecdote motivating this: the shop services other dive shops' gear (e.g. Neptune sends regulators to Pacific), so a customer can be in the store buying a wetsuit while her own regulator is being serviced in back — without knowing the shop does service at all.

## 9. All form submissions → the admin

*On the old site, the Service/contact form existed but the shop never received a single submission — a silent, costly failure.*

- **Decision:** route **every form submission into the admin** so nothing is lost. One place to see them all.
- Add an **export** option for the collected submissions.
- Keep **Riverton forms in Riverton** (separate from Pacific) to avoid brand confusion.

## 10. Pacific Scuba domain / Google account — still locked — Urgent

*Continuing from June 17 & July 15. Progress and a clearer diagnosis, but not solved.*

- **What's happening:** when the account was changed from a new location/IP (the shop is here, Jeff is in California), Google flagged it as a possible hack and **locked it down**. Even though Preston relayed an authentication number, Google now requires **Jeff to log in using the shop's code**.
- **The fix:** a **15-minute call together — Preston + Austin + Justin + Jeff** — to log in live and get past the 2FA (the code comes to Preston's number). Jeff is hard to reach but genuinely helpful once on the phone.
- **In parallel:** start trying to take over the **Squarespace** account, and figure out **who's paying for the site** (likely Glenn, the seller) — the site is still up, so someone is. If the payment can be switched over, that plus the LLC / bill-of-sale strengthens the ownership claim to Squarespace. But the *fastest* path is just solving the email/2FA on the joint call.
- **Risk:** if Pacific Scuba got shut down, the shop would lose that domain's SEO / existing-customer traffic. Worst case: launch a new domain now, then recover and swap the old one back. (Team thinks a shutdown is unlikely — Glenn would have done it already.)

## 11. Trips cleanup

- **Remove past trips** from the site (Fiji is done; Indonesia departs Monday). Kate had tried to remove one but was editing the old URL.
- Add the ability to **unpublish trips / back-date them** so past trips drop off automatically (same pattern as past cohorts).
- Context: the shop sources trips at the DEMA show (each November) and through a travel contact; they post dates as they come available.

## 12. E-learning deferral & sequencing

- **Don't turn on e-learning codes at go-live.** Keep the current manual process. Austin already built a toggle that turns off e-learning changes.
- **Sequence:** perfect **scheduling → payments → document signing** first; once those are solid, decide whether to bring e-learning into the system. One thing at a time, less complexity at once.
- **Onboarding doc:** Justin will send a **Google Doc** that clearly outlines every URL (live vs. staging), the admin, the PIN, and the running list of scheduling changes — so Kate isn't overwhelmed and both sides can collaborate in one place. (This directly addresses Kate losing track of where things live, e.g. the Pacific form / the admin PIN.)

## Decisions made

| Topic | Decision |
| --- | --- |
| Go live now | Point the real domain at the new Vercel site today; keep "Courses" → RentItBiz until scheduling is ready. Ship the front door, finish the engine behind it. |
| Two environments | Live (real domain) for customers; a separate staging URL for all scheduling editing until it's promoted. Always check the domain. |
| Hosting | Keep the domain at HostGator; cancel the other HostGator add-ons (privacy, website builder, Hatchling) once stable to cut cost. |
| Cohort visibility | Auto-hide past-dated cohorts; default the site to show only open/active cohorts. Nothing deleted — canceled/past remain visible in admin. |
| Booking flow | Put "Reserve a spot" on the cohort so it jumps straight to headcount; remove the extra screen. |
| Registration migration | toprock migrates active RentItBiz classes on the back end at go-live (no re-registration emails). Add a manual "add to cohort" function. Lightspeed stays source of truth. |
| Service | Add a Service tab; Scuba Dive serves local customers under its own brand, Pacific handles out-of-state. Keep the businesses separate. |
| Forms | Route all form submissions into the admin with an export option; keep Riverton forms separate from Pacific. |
| Pacific account | Solve via a joint 15-min call (Preston + Jeff + team); pursue Squarespace takeover + payment ownership in parallel. |
| E-learning | Deferred. Keep manual for now; revisit after scheduling + payments + signing are solid. |

## Open questions

**Open — Will the DNS fully propagate (desktops + www) without more changes?**
Phones work; some desktops showed old cache / a 308 redirect loop and SSL "generating." Re-check over time; if needed, delete & re-add the www CNAME.

**Open — Can we get Preston + Jeff on a 15-minute call to unlock the Google account?**
This is the fastest fix for Pacific. Scheduling it is the blocker.

**Open — Who is paying for the Pacific website, and can we take over that payment?**
Someone is (the site's still up) — likely Glenn. Switching it strengthens the Squarespace ownership claim.

**Resolved — How do we move already-registered students without spamming them?**
toprock migrates active classes on the back end at go-live; plus a manual add-to-cohort with no notifications.

**Resolved — Should Scuba Dive service link out to Pacific?**
No — keep local service under the Scuba Dive brand (a Service tab); Pacific stays for out-of-state.

**Resolved — Turn on e-learning at launch?**
No — deferred. Keep manual until scheduling/payments/signing are solid.

## Cadence going forward

Marketing site is live; scheduling matures on staging. Sequence: nail scheduling → payments → signing, then promote scheduling to live and migrate active registrations. E-learning stays manual until that's solid. Pacific's account gets unlocked via the joint call.

---

*Compiled from the August 1, 2026 in-person working session — corrections welcome. Speaker attribution and the Austin/Justin split are inferred from a partly-garbled transcript. Personal/off-topic chat omitted.*
