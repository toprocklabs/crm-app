<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project runs on Next.js 16.x and may differ from older patterns.
Check `node_modules/next/dist/docs/` when changing framework behavior.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project Snapshot
- App: Toprock OS — the operating system for a two-person agency. Five modules:
  **CRM** (accounts, contacts, opportunities, map), **Money** (proposals, payments),
  **Brain** (notes, meetings, activities, tasks), **Delivery** (GitHub mirror),
  **Agents** (inbox, ingest API).
- Product label: Toprock OS. "CRM" is now a module name, not the product — it covers
  accounts/contacts/opportunities and nothing else. See planning/008-toprock-os/.
- Stack: Next.js App Router, TypeScript, Tailwind, Drizzle ORM, Neon Postgres
- Auth: custom username/password login with signed JWT cookie session
- Rendering: route pages are server-rendered (`force-dynamic`) with server actions for writes

## Local Runbook
1. Install deps: `npm install`
2. Configure env in `.env.local`:
   - `DATABASE_URL=...`
   - `AUTH_SECRET=...` (>= 32 chars)
3. Sync DB schema:
   - `npm run db:generate`
   - `npm run db:push`
4. Create users (if needed):
   - `npm run user:create -- <username> <password> [displayName]`
5. Start app:
   - `npm run dev`
   - optionally `npm run dev -- --port 3001` if `3000` is occupied

## Core Structure
- `src/app/` App Router pages + server actions
- `src/app/actions.ts` every server action, all modules (create/update/log)
- `src/app/login/` auth actions and login page
- `src/lib/schema.ts` Drizzle schema and enums
- `src/lib/db.ts` shared Neon Drizzle client
- `src/lib/auth.ts` session create/verify helpers
- `src/lib/normalize.ts` pure input normalizers (text/url/phone/date) used by actions
- `src/components/` shared UI helpers (`app-shell`, autosave fields, call link, collapsible form section)
- `drizzle/` generated migrations
- `tests/` `node:test` suites for pure logic — run with `npm test`
- `scripts/sync-repos.mjs` GitHub org → `project_repos` mirror (`npm run sync:repos [-- --dry-run]`)
- `scripts/import-meetings.mjs` seeds `meetings` from the committed pairs in `scripts/seed/meetings/`
- `scripts/seed/meetings/` one `<slug>.md` + `<slug>.json` per imported client note — the source of the import
- `scripts/map-repos.mjs` links mirrored repos to accounts (`node scripts/map-repos.mjs [--apply]`)
- `scripts/import-brain.mts` one-time, replayable import of the Obsidian vault (`npm run import:brain`)
- `scripts/map-brain.mts` links brain notes to accounts/contacts (`npm run map:brain -- --apply`)
- `scripts/seed/brain/` the 69 vault notes, committed verbatim — the source of that import
- `scripts/create-user.mjs` CLI user upsert helper
- `scripts/run-tests.mjs` test discovery shim (Node 20's runner doesn't glob `.ts`)

## Current Routes
- `/` dashboard
- `/login`
- `/accounts`, `/accounts/[id]`
- `/contacts`, `/contacts/[id]`
- `/opportunities`, `/opportunities/[id]`
- `/proposals`, `/proposals/[id]` (internal proposal management + signed-PDF download at `/proposals/[id]/pdf`)
- `/payments` Stripe payment mirror (ledger + unassigned-payment matching)
- `/meetings`, `/meetings/[slug]` client meeting notes (merged in from `toprock_client_notes`)
- `/brain`, `/brain/[...slug]`, `/brain/new` the Toprock Brain (merged in from the `toprock_brain` Obsidian vault)
- `/tasks`
- `/activities`
- `/inbox` human-in-the-loop queue for agent-proposed writes (`suggestions`)
- `/map` geocoded account map + proximity sourcing
- **Token-gated agent API (no login):** `GET|POST /api/brain/documents`, `POST /api/brain/runs` — the ingest path for the scheduled agent runs (`BRAIN_INGEST_TOKEN` bearer)
- **Public, PIN-gated (no login):** `/p/[slug]` client-facing Statement of Work + signing, `/p/[slug]/terms` Terms of Service, `POST /p/[slug]/sign` signing endpoint
- compatibility redirects: `/customers` and `/customers/[id]`
- Every authenticated route has a `loading.tsx` skeleton; keep that true when adding routes.

## Data Model (Drizzle)
- `users` (local auth users)
- `companies` (UI term: Accounts)
- `contacts`
- `deals`
- `sales_tasks`
- `activities`
- `proposals` (client-facing statements of work; markdown content, PIN, status lifecycle)
- `proposal_documents` (the signed PDF base64, one row per proposal — kept off the hot proposals row)
- `project_repos` (read-only mirror of the GitHub org's repos; `company_id` links delivery to an account)
- `meetings` (client meeting notes; markdown body, one canonical account)
- `meeting_companies` (extra accounts a meeting is shared with — the scuba cluster)
- `meeting_action_items` (per-meeting homework, rows not prose, so it rolls up across clients)
- `brain_documents` (every note from the Obsidian vault; markdown body + JSONB frontmatter)
- `brain_document_links` (the `[[wiki-link]]` graph; a null target is a note nobody has written yet)
- Enums:
  - `account_stage`: new_lead, attempting_to_engage, engaged, in_pipeline, customer
  - `deal_stage`: lead, qualified, proposal, negotiation, won, lost
  - `activity_type`: note, call, meeting, email, instagram, linkedin, task
  - `task_status`: open, done
  - `proposal_status`: draft, sent, viewed, signed, declined, superseded
  - `meeting_action_status`: todo, doing, done, deferred
  - `brain_doc_kind`: entity, digest, meta

## Coding Conventions (Repo-Specific)
- Prefer server components for pages and data reads.
- Keep mutations in server actions (`"use server"`) and validate inputs with Zod.
- Define every action in `src/app/actions.ts` with `defineAction({ schema, input, handler })` from `src/lib/define-action.ts`. It runs `requireUser()` and resolves the db before your handler, so authorization can't be forgotten. Keep the `input` mapper explicit — `id: raw ? Number(raw) : undefined` is what keeps a blank `<select>` out of a `z.coerce.number().positive()` field.
- Autosave field components share their machinery via `src/components/auto-save-hooks.ts` (`useAutoSaveInput`, `useAutoSaveEditable`, `useAutoSaveSelect`). Three interaction families exist on purpose — click-to-edit, blur-to-save, and select-on-change — so add to the right hook rather than merging them.
- Keep contact/account terminology consistent in UI:
  - UI label: Account
  - DB table: `companies`
- Keep opportunity terminology consistent in UI:
  - UI label: Opportunity
  - DB table: `deals`
- Phone numbers are normalized to US format in actions (`(###) ###-####`).
- Keep routes dynamic when data should always be fresh.

## UI Direction
- Current approved direction is a Gong-inspired revenue-workspace UI, not a generic SaaS card layout.
- Preserve the dark utility sidebar, bright analytics canvas, crisp white panels, and cyan/blue accent system unless explicitly redesigning again.
- Favor dense but readable information hierarchy: compact KPI blocks, sharp tables, restrained pills, and fewer redundant explainer sections.
- Avoid reintroducing glossy/glassy gradients or duplicative summary panels that repeat the page header or table metadata.
- The shell is full-bleed (no centered `max-w` cap) so wide tables get the whole viewport. Don't reintroduce a max-width wrapper in `app-shell.tsx` or `SkeletonShell`.
- The desktop sidebar collapses to a 64px icon rail. State lives in `document.documentElement.dataset.sidebar` (`expanded` / `collapsed`), seeded before paint by the inline script in `app/layout.tsx` and persisted to `localStorage["toprock.sidebar-collapsed"]`. Collapsed styling is CSS-only (`html[data-sidebar="collapsed"] …` in `globals.css`) — keep it out of React state or it re-introduces a hydration mismatch and a flash of the expanded rail.
- On `/accounts`, the account table is the page. Add account and Closed Lost are secondary: both are compact `CollapsibleFormSection variant="compact"` toggles, not full panels. Do not promote either back into its own headed section.

## Key Workflows Added
- Account stage workflow lives at `/accounts` and `/accounts/[id]`.
- Account create/edit supports:
  - selecting `companies.stage` during account creation
  - inline account stage updates on account detail via `updateCompanyField`
- Opportunity detail workflow lives at `/opportunities/[id]`.
- Opportunity detail supports:
  - editing core fields via `updateDeal`
  - stage updates + stage history notes via `updateDealStage`
  - contextual activity logging via `logActivity` with `returnPath`
- Many create/log forms are wrapped in `CollapsibleFormSection` and default collapsed.
- Collapsible sections auto-close on submit (`onSubmitCapture`) and remain minimized after refresh.

## Proposals / Signed Agreements (merged from proposal_creator — plan 002)
- Proposals are first-class records (`proposals` table) tied to an account (required) and optionally an opportunity/contact. The old standalone `proposal_creator` repo is superseded; do not add new proposals there.
- Content stays the legacy four-section markdown: `## Overview`, `## Pricing` (GFM table: Phase / Item | Description | Cost), `## What's Included` (bullets), `## Notes` (optional). Parsers live in `src/lib/proposal/markdown.ts`.
- **Creating a proposal by prompting Claude Code** (the standard flow): give it a transcript or pricing notes → it drafts the four-section markdown following the brand rules in `src/lib/proposal/toprock_branding.md` (tone: direct, second person, no jargon, no exclamation marks; accent used sparingly) → it inserts the row via SQL or you paste into the `/proposals` create + edit forms → review in-app, then send the client `/p/[slug]` + the PIN.
- **Smart create:** the `/proposals` form accepts a "New account name" — `createProposal` creates the account (case-insensitive match first, stage `in_pipeline`) and, unless an existing opportunity is picked, auto-creates one from the proposal (stage `proposal`, MRR/one-time parsed from the Pricing table via `parsePricingTotals`). Saving proposal content later back-fills the linked opportunity's value only while it's still 0/0.
- **Tying SOWs to opportunities:** the Agreements panel (account + opportunity pages) has a per-proposal dropdown backed by `updateProposalDeal` (validates same-account). Never render these autosave `<form>` components inside a `<p>` — invalid HTML → hydration mismatch that silently kills the panel's interactivity.
- Client flow: `/p/[slug]` is public but PIN-gated server-side (per-proposal `pin`, internal master PIN via `PROPOSAL_INTERNAL_PIN`, default 3067). PIN entry sets a slug-scoped cookie and flips `sent → viewed`. Signing (draw or type) builds the PDF client-side (JPEG-based, ~200KB) and POSTs to `/p/[slug]/sign`, which stores the PDF on the row, flips status to `signed`, logs an account activity, and notifies.
- Notifications on signing (`src/lib/proposal/notify.ts`): `RESEND_API_KEY` → Resend emails (internal + client); else `PROPOSAL_SIGNED_WEBHOOK_URL` → legacy Apps Script payload; else skip (PDF is stored regardless). Optional: `PROPOSAL_NOTIFY_EMAIL`, `PROPOSAL_FROM_EMAIL`.
- Legacy backfill: `node scripts/import-proposals.mjs [--dry-run] [--source <proposal_creator path>] [--pdf-dir <dir of <slug>.pdf signed files>]`. Idempotent (upsert by slug); never downgrades a `signed` status.
- The signed PDF lives in its own table, `proposal_documents` (one row per proposal), so a stray `select()` can no longer drag multiple megabytes of base64 into a list query. Only `/proposals/[id]/pdf` and the signing route touch it. To ask *whether* a PDF exists without fetching bytes, use `hasSignedPdfExpr` from `src/lib/proposal/has-signed-pdf.ts`.
- `proposals.signed_pdf_base64` still exists and is read as a fallback, but nothing writes to it. It is dropped in a follow-up; until then, keep using explicit column lists on proposal queries.
- The client page must stay visually identical to the legacy hosted proposals (CSS ported verbatim in `src/app/p/proposal-public.css`).

## GitHub project activity (plan 005)
- `project_repos` is a **read-only mirror** of the `toprocklabs` GitHub org. Nothing in this app writes to GitHub. The request path never calls the GitHub API — `/accounts` reads Postgres only.
- Refresh with `npm run sync:repos`. One request (`GET /orgs/{org}/repos`) covers every repo because the org listing carries `pushed_at`; a full sync costs 1–2 calls against a 5,000/hour budget. **Not yet scheduled** — until a cron is wired up the column is only as fresh as the last manual run.
- The sync deliberately does **not** touch `company_id` or `is_internal`. Those are curated by hand and must survive every sync. Repos that vanish from the org listing are marked `archived`, never deleted — the account link is the expensive part.
- Auth: `GITHUB_TOKEN` (fine-grained PAT, read-only, Contents + Metadata) with `GITHUB_ORG` defaulting to `toprocklabs`. Locally the script falls back to `gh auth token`, so a developer with `gh auth login` needs no extra setup.
- Mapping new repos: `node scripts/map-repos.mjs` reports, `--apply` writes. The slug matcher gets ~70%; links it can't reach (`scuba-dive-riverton` → *Scuba Dive Utah*) live in `MANUAL_LINKS` inside that script so the mapping is reproducible from an empty database.
- The "Last push" column shows `MAX(last_push_at)` across an account's non-archived repos. An account with **no linked repo renders grey `—` and sorts last in both directions** — it is unmeasured, not stale, and must never be colored like an abandoned account.
- Recency bands live in `src/lib/push-recency.ts` (pure, `now` passed in, covered by `tests/push-recency.test.ts`). Change thresholds there, not in the page.

## Client meeting notes (plan 006)
- The standalone `client-projects/toprock_client_notes` site is **frozen**. Never add a note there. Meeting notes live in this app now.
- An account page leads with **money** (`BillingPanel`) then **Meetings & notes**. Contacts, engagement, tasks and details are collapsed on purpose — this app serves a two-person agency, so the pipeline machinery is supporting detail, not the headline. Don't promote them back up.
- A meeting belongs to one account (`meetings.company_id`) and may be shared with more via `meeting_companies`. Always read through `src/lib/meeting/queries.ts` — a bare `where company_id = ?` silently hides shared notes from the second account.
- `meeting_action_items.company_id` is denormalised from the meeting's **owner** account. The per-account panel reads by *visibility* (so a shared note's homework shows on both pages); the cross-account roll-up reads by *owner* (so it can't double-count). That asymmetry is deliberate.
- **Never select `body_md` in a list query** — it averages ~11KB. Only `/meetings/[slug]` reads it. Same lesson as `proposal_documents` in plan 002.
- Body markdown is parsed by `src/lib/meeting/markdown.ts` into a block tree and rendered by `MeetingBody` — there is no `dangerouslySetInnerHTML` in the meeting path, so an imported note can't inject markup. Supported subset: `##`/`###`, `-` bullets, GFM tables, `---`, `**bold**`, `*em*`, `` `code` ``, `[links](url)`. Extend the parser (and `tests/meeting-markdown.test.ts`), not the callers.
- Re-import the seed notes with `node scripts/import-meetings.mjs [--dry-run] [--force] [--only <slug>]`. It is idempotent by slug, and **without `--force` it never overwrites an edited body or resurrects completed action items**. The committed `scripts/seed/meetings/*.{md,json}` pairs make the whole import replayable from an empty database.
- Opportunities feed the money panel (`deals.value_cents` and `implementation_cost_cents` where stage = `won`). Demoted in the UI, still load-bearing — don't stop maintaining them.

## The Toprock Brain (plan 007)
- The `toprocklabs/toprock_brain` Obsidian vault is **being retired**. Its 69 notes are `brain_documents` rows, and the committed `scripts/seed/brain/**` copies make the import replayable from an empty database. **Never add a note to the vault.** (Phase 3 — archiving the repo — is not done yet; until it is, the vault still exists but nothing should write to it.)
- `brain_documents.path` (`Companies/Coatary.md`) is the import identity; `slug` (`companies/coatary`) is the URL. They are separate because vault filenames contain spaces and dots. Both are unique.
- **Never select `body_md` in a list query.** Bodies average 2.2KB and the largest is 12.4KB, and the digests grow weekly. Every read goes through `src/lib/brain/queries.ts`, where exactly one function (`getBrainDocument`) selects the body.
- **The import must never touch `company_id`, `contact_id`, or an edited body.** `npm run import:brain -- [--dry-run] [--force] [--only <slug-prefix>]` is idempotent by `path` and short-circuits on a `content_sha` match; without `--force` it preserves a body edited in the app. Account links come from `npm run map:brain -- --apply`, whose `MANUAL_LINKS` const keeps the un-guessable ones (`MacArthur, Heder & Metler` → `MHM Law Firm`) reproducible.
- **The full-text index is created by hand, not by drizzle-kit.** After `db:push`, run `CREATE INDEX IF NOT EXISTS brain_documents_fts_idx ON brain_documents USING GIN (to_tsvector('english', search_text));`. Drizzle 0.45 has no `tsvector` type, so the expression index lives outside the schema file. Postgres will seq-scan it at 69 rows — that is correct, not a broken index.
- Classification keys on **folder, the `YYYY-MM-DD ` filename prefix, and `[[wiki-links]]` — never frontmatter**, because 28 of the 69 notes have none and the rest disagree (`name` vs `title`, `type: person` vs `tags: [person]`). Frontmatter is a JSONB bag read only when present. Rules live in `src/lib/brain/frontmatter.ts` (pure, covered by `tests/brain-frontmatter.test.ts`).
- **Anything that writes a body must rebuild the link graph.** `rebuildDocumentLinks` / `resolveDanglingLinksTo` in `src/lib/brain/links.ts` — the importer does it, and so must every server action. Skip it and an authored note's `[[links]]` all render dangling. A null `target_doc_id` is meaningful (a note nobody has written yet), so never delete dangling rows.
- The markdown parser is shared with meetings (`src/lib/meeting/markdown.ts`) and now also handles `#` H1, `- [ ]` task items and `[[wiki-links]]`. Extend the parser and its tests, not the callers. There is no `dangerouslySetInnerHTML` in the brain path either.
- Five businesses exist twice in the vault (`Clients/X.md` and `Companies/X.md`, already disagreeing on `status`). Both import and both link to the same account so the divergence is visible. Merging them is an editorial call, not the importer's.
- **The agent write path is `POST /api/brain/documents`** (phase 2), authed with a `BRAIN_INGEST_TOKEN` bearer rather than the session cookie, because both callers are headless scheduled scripts. `GET` on the same route does existence checks and folder listings — the ingest needs reads, not just writes. `POST /api/brain/runs` opens and closes an `agent_runs` row so an ingest's cost and output are auditable.
- **Ownership is enforced in `src/lib/brain/upsert.ts`, not by convention.** An agent may replace a note whose `source = 'agent'` (it owns its digests), but a blind write to a `source = 'manual'` note is a `409`. To edit a human's note the caller must read it and resend with `expectedSha` — read-modify-write. There is deliberately no force flag; add one and the guarantee is gone.
- Everything derived from a note (kind, folder, date, slug, search text, links) is derived inside `upsertBrainDocument`, so an agent-written note is indistinguishable from an imported one. Never re-derive any of it at a call site.
- **Still outstanding before the vault can be archived (phase 3):** the Codex daily run at `E:\Codex Projects\toprock_brain_scheduled_run_jt` still writes to the vault and must be repointed on the machine that hosts it. See `planning/007-toprock-brain/plan.html`.

## When Editing Existing Features
- If touching contact profile editing, preserve blur autosave behavior.
- If touching phone display, preserve `Call` button (`tel:` link behavior).
- If adding activity logging context, set `returnPath` so the page revalidates after submit.
- If adding/renaming routes, update top nav in `src/components/app-shell.tsx`.
- If editing create/log forms, preserve the collapsible interaction pattern.
- If editing account stage selection, preserve immediate client-side feedback and the direct server-action update pattern in `AutoSaveCompanySelectField`.
- If editing the account create form on `/accounts`, keep the expanded form spacious and readable (2-column grid, full-width URL/next-step fields); only its collapsed toggle is compact.

## Database Change Workflow
1. Update `src/lib/schema.ts`
2. Run `npm run db:generate`
3. Review generated SQL in `drizzle/`
4. Run `npm run db:push`
5. Run `npm run build` and verify affected pages

## Validation Checklist Before Hand-off
- `npm run lint`
- `npm test`
- `npm run build`
- If auth touched: verify `/login` flow and guarded pages redirect as expected
- If schema touched: verify migration generated and applied
- If account stage touched: verify `/accounts` create flow and `/accounts/[id]` stage updates
- If opportunity workflow touched: verify `/opportunities/[id]` save + stage updates + timeline logging
- If proposals touched: verify `/proposals` create/edit, the public `/p/[slug]` PIN gate + render, and (for signing changes) an end-to-end test signature against a throwaway proposal row
- If project repos touched: run `npm run sync:repos -- --dry-run`, then confirm `/accounts` sorts by Last push in both directions with unlinked accounts pinned last
- If meetings touched: run `node scripts/import-meetings.mjs --dry-run`, open a note with tables (`/meetings/2026-08-01-website-go-live-domain-cutover`), and confirm a shared note still appears on both Scuba Dive Utah and Pacific Scuba Repair
- If the brain API touched: confirm a bad token gets 401, a blind write to a `source='manual'` note gets 409, and a read-modify-write with `expectedSha` succeeds
- If the brain touched: run `npm run import:brain -- --dry-run` (expect 69 notes / 41 with frontmatter / 0 slug collisions), run it again for real and confirm it reports 69 unchanged, then open `/brain/companies/coatary` and check a `[[wiki-link]]` is a working link and the backlinks panel is populated

## Safety Notes
- Do not store plaintext passwords; always hash with bcrypt (`bcryptjs`).
- Keep `AUTH_SECRET`, `BRAIN_INGEST_TOKEN` and DB credentials in `.env.local` only. `BRAIN_INGEST_TOKEN` is a shared bearer for the headless ingest runs — rotating it means updating `.env.local` here, the Vercel project env, and `.env.local` in each scheduled-run repo at the same time.
- Preserve existing redirects from `/customers` to `/accounts` unless explicitly removing backward compatibility.

## Known Issues / Tech Debt
- Single-tenant data model: all authenticated users see all data; no per-user/org authorization boundaries yet.
- Contact-to-opportunity linking is partial: `deals.primaryContactId` is editable, but not consistently set in all create flows.
- Minimal error UX: server action validation failures generally throw; no structured inline form error states yet.
- Stage change guard for `lost` reason is soft (auto-fills "No reason provided."); no hard UI enforcement yet.
- Phone normalization assumes US numbers only; non-US formats are rejected.
- No test suite yet (unit/integration/e2e); quality relies on lint/build and manual verification.
