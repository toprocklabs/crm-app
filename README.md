# Toprock OS

The operating system for Toprock Labs — one app holding everything about the business, for a two-person agency.

It started as a CRM. CRM is now one module of five.

| Module | What it holds |
|---|---|
| **CRM** | Accounts, contacts, opportunities, proximity sourcing map |
| **Money** | Client-facing proposals with PIN-gated signing, Stripe payment mirror |
| **Brain** | 75 imported notes with a `[[wiki-link]]` graph, meetings, activities, follow-ups |
| **Delivery** | Read-only mirror of the `toprocklabs` GitHub org, linked to accounts |
| **Agents** | Human-in-the-loop queue for agent-proposed writes, plus a token-gated ingest API |

Built with Next.js (App Router), Neon Postgres, Drizzle ORM and Tailwind.

## Setup

```bash
npm install
```

Create `.env.local`:

```bash
DATABASE_URL="postgresql://..."
AUTH_SECRET="at-least-32-random-characters"
# Optional, per module:
STRIPE_SECRET_KEY="sk_..."          # payment mirror
GITHUB_TOKEN="ghp_..."              # repo mirror (falls back to `gh auth token`)
BRAIN_INGEST_TOKEN="brain_..."      # agent write API
RESEND_API_KEY="re_..."             # proposal-signed notifications
```

Apply the schema and create a login:

```bash
npm run db:generate
npm run db:push
npm run user:create -- alice StrongPassword123 "Alice"
npm run dev
```

Open http://localhost:3000.

> **One index is created by hand.** Drizzle 0.45 has no `tsvector` type, so after `db:push` run once:
> ```sql
> CREATE INDEX IF NOT EXISTS brain_documents_fts_idx
>   ON brain_documents USING GIN (to_tsvector('english', search_text));
> ```

## Where things live

- `src/app/` — routes and server actions. Pages are server components; every mutation is a server action defined through `defineAction`, which runs `requireUser()` before your handler so authorization can't be forgotten.
- `src/lib/` — pure logic and data access, one directory per module (`brain/`, `meeting/`, `proposal/`, `payments/`, `stripe/`).
- `scripts/` — one-time imports and mirrors. Every one is idempotent and replayable from an empty database.
- `scripts/seed/` — committed source data for the imports (client meeting notes, brain notes), so nothing depends on a machine.
- `planning/` — a self-contained HTML plan per feature. **Start at `planning/index.html`.**
- `tests/` — `node:test` suites over the pure logic. `npm test`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` · `lint` · `test` · `build` | The validation loop before any hand-off |
| `npm run db:generate` · `db:push` · `db:studio` | Schema |
| `npm run user:create -- <user> <pass> [name]` | Create or update a login |
| `npm run sync:repos [-- --dry-run]` | Mirror the GitHub org into `project_repos` |
| `npm run import:brain [-- --dry-run\|--force]` | Import the brain notes from `scripts/seed/brain/` |
| `npm run map:brain [-- --apply]` | Link brain notes to accounts and contacts |
| `npm run stripe:import [-- --dry-run]` | Mirror Stripe charges and subscriptions |
| `node scripts/import-meetings.mjs [--dry-run]` | Import client meeting notes |
| `node scripts/map-repos.mjs [--apply]` | Link mirrored repos to accounts |

## Agent API

Headless agents write to the brain over HTTP with a `BRAIN_INGEST_TOKEN` bearer — not the session cookie, since they have no browser:

```
GET  /api/brain/documents?folder=Projects       list a folder
GET  /api/brain/documents?path=…&include=body   read a note + its current sha
POST /api/brain/documents                       create or replace
POST /api/brain/runs                            open / close an audited run
```

Ownership is enforced server-side: an agent may replace a note it wrote, but a blind write to a human-authored note is a `409`. Editing one requires reading it first and resending with `expectedSha`. There is deliberately no force flag.

## Conventions worth knowing before you change anything

`AGENTS.md` is the real contract — read it. The rules that bite hardest:

- **Never select `body_md` in a list query.** Three plans have now written this down.
- **Imports never touch `company_id` or an edited body.** The curated link is the expensive part.
- **Anything that writes a note body must rebuild the wiki-link graph**, or its links all render dangling.
- **Keep the sidebar's collapsed state in CSS, not React**, or you reintroduce a hydration mismatch.
- **Planning artifacts are HTML, not Markdown**, and an accepted plan is superseded rather than edited.

## History

Six merges got here, each folding a separate tool into this one: proposals (002), Stripe (003), architecture hardening (004), GitHub delivery activity (005), client notes (006), and the Obsidian brain vault (007). The pattern each time: Postgres as the source of truth, the old thing archived rather than deleted, and the import replayable from an empty database.

Full reasoning for every one of them is in `planning/`.
