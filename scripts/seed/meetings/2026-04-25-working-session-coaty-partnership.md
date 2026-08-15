## Participants

- **Flint** — Client — owner Coatary; co-owner Peaceful (Speaker A)
- **Austin Truong** — Top Rock — co-founder & dev; Coatary investor (Speaker B)
- **Justin** — Top Rock — co-founder; ran the recap (Speaker C)

Mentioned: **Emil** (Flint's partner; runs Peaceful day-to-day; grew up 6 doors from Flint in Vineyard, UT), **Emilia** (admin → ops manager; site maintainer), **Ashley** (Coatary ops manager; processes POs), **Melody** (Peaceful front desk), **Taylor** (Peaceful property manager), **QXO** (distribution partner), **LG Nano H2O** (Flint's Fortune-500 contact). This note is compiled from the structured meeting digest.

## 1. The companies & problem space

### Coatary Technologies

- Manufactures & installs **resinous floor coatings** — epoxy, polyaspartic, polyurethane, flake systems.
- Channels ~**50% direct-to-contractor, 50% distributor**. Distributor channel is Utah-only and being de-prioritized; growth target is **direct-to-contractor outside Utah**.
- Just signed with **QXO** (acquired for $12B; ~50 US distribution locations). Coatary distributes for QXO in Salt Lake; QXO distributes Coatary in SLC + Idaho, with possible Denver, Nevada, New Mexico & three California metros.
- **Pain point:** QXO's front-desk CSRs aren't coatings experts — they can't spec a flake job for a walk-in contractor. Coatary needs a tool that lets a non-expert ask a few questions and produce a correct order. (This is what Coaty solves.)

### Peaceful Property Management

- Founded 2018; grew from 10 → **~300 units**. Two entities: **Peaceful Property Management** + **Peaceful Maintenance** (the maintenance subsidiary).
- Strategic move: spin **Peaceful Maintenance into an outside-facing service company** serving other PM companies and homes broadly — *this is the next website Flint wants built.*
- Heavily international team (Guatemala, Chile); Emil is Guatemalan. Flint & Emil now do strategy/oversight only.

## 2. The Coaty agent — centerpiece

*Flint's headline: in ~30 hours over one weekend, with no CS background, he built a working Claude-powered product-selection agent.*

### What it does

A conversational decision-tree that asks: job **square footage** → **indoor/outdoor** → **temperature window** (drives cure time) → **flake/aesthetic** → **surface condition**, then outputs a recommended system, products + quantities, coverage math, cure-time disclaimers, best-practice notes, and a **draft purchase order**.

### How he built it

- Built in **Claude Co-work**, then finished in **VS Code** (terminal + GitHub), copying code by hand. Hit Claude Max limits repeatedly — "every five hours, like a max alarm clock."
- Sold the vision to Claude first, then iterated infrastructure, then logic. Treated Claude's **callouts of contradictions in his own thinking** as the most useful part.
- Stack (provisional, pending audit): **Anthropic API** direct, **Stripe** for paid distributor seats, sign-in/sign-up flow, deployed on its own **Vercel** project + **GitHub** repo.

### Roadmap

- **v1** — information-only intelligence agent (contractor support + distributor CSR enablement).
- **v2** — Coaty takes work: generate a multi-month bulk PO from a contractor's booked pipeline, optimize for pallet quantities + freight, send to Ashley to process.
- **v3** — educational platform: same knowledge base drives lead capture from anonymous contractors looking up coverage tables.

**Naming:** branded **Coaty** (workshopped from Cloudy/Cody/Coatie). Austin's framing — name the agent as a *person*, not a "chatbot" (Workstream calls theirs "Mira").

## 3. Architecture: static site → web application

*Coaty changes the game — Coatary is becoming an application, not a brochure. Decide structure up front to avoid repeated refactors.*

- Choose **mobile vs. web app vs. PWA** deliberately (Flint flagged QR codes on packaging → TDS sheets as an obvious future feature).
- Build flexibly so adding apps (PO calculator, knowledge base, applicator finder, e-commerce) doesn't require a rewrite each time.
- Austin: *"If you put more effort into planning at the beginning, the whole process gets way more efficient."* Flint's parallel: "Like building a manufacturing company — I have to be 12 months ahead of the infrastructure as demand comes."

## 4. The "second brain"

*Austin walked Flint through the concept he uses for both Workstream and Top Rock.*

- A **folder of markdown files** organizing all context about a person, role, business, or project — pulled daily from transcripts, deals, emails, calendar — so Claude Code can reference it when building anything.
- **Obsidian** is the tool of choice. **Notion** is "data housing," not an AI-readable brain (noise, formatting, permissions). Markdown wins because Claude reads it faster and with less ambiguity.
- Each individual/role gets its own brain; companies get company-level brains. (Justin keeps his Top Rock brain and Lucid brain separate on purpose.)
- **Recommendation for Coatary:** start architecting its second brain *now*, before more data accumulates outside it. Coaty's system prompt already implicitly is one — make that knowledge explicit, structured, reusable.

## 5. The Peaceful Maintenance opportunity

*Flint pitched a Peaceful Maintenance website as the second engagement — AI-augmented, not just a brochure.*

- **Front desk (Melody)** — with an agent at her side, one person could support ~1,000 units instead of being a bottleneck.
- **Property managers (Taylor)** — an agent trained on Peaceful's culture/policies/procedures makes the PM an **orchestrator, not a doer**.
- Pattern: humans become **"agent managers"** — orchestrating, escalating, retraining the brain on new situations.
- Flint: *"Property-management margins are so small it's hard to hire competent thinking. With AI, an army of competent, hungry people in Guatemala and Chile can grow Peaceful to 5,000 units with the current team."*

## 6. Social media agent

- Weekly auto-generated posts to **Instagram + LinkedIn** (Facebook via cross-post), built from the existing photo gallery, with optional AI image-regen as an asset multiplier.
- Goal: **look alive, not win at content.** **Coatary first, Peaceful second.**
- Justin's closing decision: *"We'll start building out social media for Coatary first, and then maybe Peaceful."*

## 7. Tooling decisions

| Tool | Decision / note |
| --- | --- |
| Transcription | Flint uses **Omni** (physical device; captures phone audio via vibration) + **Plaud**; Top Rock uses **Granola**. |
| Slack | Separate **Peaceful** + **Coatary** workspaces, free tier on purpose (no message persistence = less legal exposure). Add Justin & Austin to both. |
| Docs | Migrate from **SharePoint → Google Drive** — Claude has a native Drive connector, far easier for the second brain. Flint open to it. |
| Build tooling | Set Flint up on **Claude Code** (stop copy-pasting from Co-work) — "30 hours becomes an hour." Justin uses Codex, Austin uses Claude Code; rotate to avoid lock-in (Codex strong backend, Claude better front-end). |
| Hosting | Coatary marketing site on **Vercel** (DNS from `coatary.com`). WordPress still up but not serving — can cancel. Multi-user Vercel is paid (~$20/user/mo); single shared sign-in + GitHub auto-deploy for now. |
| GitHub | Flint added Austin (`a9austin`) as a collaborator on the marketing-site repo during the meeting; same for the Coaty repo next. |
| Misc | **Whisper Flow** mouse-button voice-to-text demoed ("reduce friction to using AI"); **GPT-4o image** currently beats Google Nano Banana for photoreal background swaps. |

## 8. Flint's project framework

**Ideate → Design → Build → Operate → Delegate**

- For both companies: go back to **Ideate** and dream big without constraint (mobile apps, internal AI surfaces, full e-commerce parity).
- Then **prioritize ruthlessly** — no more than two priorities at a time, ideally one.
- Then **Design** that one thing with the future funnel in mind so architecture supports what's next without rebuilds.
- Flint: "I do the heavy lifting on ideation, methodically — that helps us deploy each project more efficiently."

## 9. Partnership shape

- **Top Rock = thought partner + builder:** build the site & agent integrations, then train Flint to maintain in Claude Code; lean in when something breaks beyond his comfort.
- **Flint + Emilia = maintainers:** Flint owns strategy + the AI side; Emilia handles cosmetic/day-to-day edits — goal is she works in Claude Code directly, not bottlenecked on Top Rock.
- **Coatary is the test case** for everything; Peaceful inherits whatever works.
- **Pricing: open.** Top Rock charges as low as $300 while learning; wants a flat retainer long-term but in "figure it out as we go" mode. Top Rock willing to **partner on Fortune-500 sales** (e.g. LG) once proof points exist.

## Decisions made

| Topic | Decision |
| --- | --- |
| Code handoff | Flint hands off the Coatary site repo (Austin added) and the **Coaty repo** next; Austin audits Coaty end-to-end. |
| Architecture | Plan for a **web application**, not a brochure — build flexibly for future apps; reserve `coaty.coatary.com` + `app.coatary.com`. |
| Second brain | Start architecting Coatary's second brain now; migrate **SharePoint → Google Drive**. |
| First build | **Social media agent for Coatary first**, then Peaceful. |
| Enablement | Set Flint up on **Claude Code**; grow Emilia into self-serve maintainer. |
| Framework | Adopt **Ideate → Design → Build → Operate → Delegate**; ideate big, then prioritize to one thing. |
| Test bed | **Coatary is the test case**; Peaceful inherits what works. |

## Open questions

**Open — Domain naming for the app surface?**
`coaty.coatary.com` for Coaty v1; `app.coatary.com` for the unified app. Confirm & reserve in DNS.

**Open — Long-term auth provider?**
Decide after the audit — Lucia / Auth.js / Supabase Auth / Clerk on the table.

**Open — Anthropic API key custody?**
Coaty uses Flint's personal key today; need an **org-level key** once Top Rock is in the codebase.

**Open — Stripe live vs. test?**
Confirm during the audit; rotate keys if needed.

**Open — Partnership pricing structure?**
Punted — Top Rock to return with flat-retainer / project / hybrid options.

**Resolved — Kill WordPress?**
Yes — DNS points to Vercel; WordPress can be canceled.

**Resolved — Coatary or Peaceful first for social?**
Coatary first.

---

*Compiled from the April 25, 2026 working-session digest — corrections welcome. Side plans referenced: `coatary-coaty-merge-plan`, `coatary-social-media-agent-idea`.*
