<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project runs on Next.js 16.x and may differ from older patterns.
Check `node_modules/next/dist/docs/` when changing framework behavior.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project Snapshot
- App: lightweight CRM (accounts, contacts, opportunities, tasks, activities)
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
- `src/app/actions.ts` primary CRM mutations (create/update/log)
- `src/app/login/` auth actions and login page
- `src/lib/schema.ts` Drizzle schema and enums
- `src/lib/db.ts` shared Neon Drizzle client
- `src/lib/auth.ts` session create/verify helpers
- `src/components/` shared UI helpers (`crm-shell`, autosave fields, call link)
- `drizzle/` generated migrations
- `scripts/create-user.mjs` CLI user upsert helper

## Current Routes
- `/` dashboard
- `/login`
- `/accounts`, `/accounts/[id]`
- `/contacts`, `/contacts/[id]`
- `/opportunities`
- `/tasks`
- `/activities`
- compatibility redirects: `/customers` and `/customers/[id]`

## Data Model (Drizzle)
- `users` (local auth users)
- `companies` (UI term: Accounts)
- `contacts`
- `deals`
- `sales_tasks`
- `activities`
- Enums:
  - `deal_stage`: lead, qualified, proposal, negotiation, won, lost
  - `activity_type`: note, call, meeting, email, task
  - `task_status`: open, done

## Coding Conventions (Repo-Specific)
- Prefer server components for pages and data reads.
- Keep mutations in server actions (`"use server"`) and validate inputs with Zod.
- Gate write actions with `requireUser()`.
- Keep contact/account terminology consistent in UI:
  - UI label: Account
  - DB table: `companies`
- Phone numbers are normalized to US format in actions (`(###) ###-####`).
- Keep routes dynamic when data should always be fresh.

## When Editing Existing Features
- If touching contact profile editing, preserve blur autosave behavior.
- If touching phone display, preserve `Call` button (`tel:` link behavior).
- If adding activity logging context, set `returnPath` so the page revalidates after submit.
- If adding/renaming routes, update top nav in `src/components/crm-shell.tsx`.

## Database Change Workflow
1. Update `src/lib/schema.ts`
2. Run `npm run db:generate`
3. Review generated SQL in `drizzle/`
4. Run `npm run db:push`
5. Run `npm run build` and verify affected pages

## Validation Checklist Before Hand-off
- `npm run lint`
- `npm run build`
- If auth touched: verify `/login` flow and guarded pages redirect as expected
- If schema touched: verify migration generated and applied

## Safety Notes
- Do not store plaintext passwords; always hash with bcrypt (`bcryptjs`).
- Keep `AUTH_SECRET` and DB credentials in `.env.local` only.
- Preserve existing redirects from `/customers` to `/accounts` unless explicitly removing backward compatibility.

## Known Issues / Tech Debt
- Single-tenant data model: all authenticated users see all data; no per-user/org authorization boundaries yet.
- Contact-to-deal relationship is underused: `deals.primaryContactId` exists, but most create flows do not currently set it.
- Minimal error UX: server action validation failures generally throw; no structured inline form error states yet.
- Activity logging is now contextual (account/contact), but dashboard still shows global mixed activity with no filters.
- Phone normalization assumes US numbers only; non-US formats are rejected.
- No test suite yet (unit/integration/e2e); quality relies on lint/build and manual verification.
