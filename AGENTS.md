<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This project runs on Next.js 16.x and may differ from older patterns.
Check `node_modules/next/dist/docs/` when changing framework behavior.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

## Project Snapshot
- App: lightweight CRM (accounts, contacts, opportunities, tasks, activities)
- Product label: Toprock CRM
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
- `src/components/` shared UI helpers (`crm-shell`, autosave fields, call link, collapsible form section)
- `drizzle/` generated migrations
- `scripts/create-user.mjs` CLI user upsert helper

## Current Routes
- `/` dashboard
- `/login`
- `/accounts`, `/accounts/[id]`
- `/contacts`, `/contacts/[id]`
- `/opportunities`, `/opportunities/[id]`
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
  - `account_stage`: new_lead, attempting_to_engage, engaged, in_pipeline, customer
  - `deal_stage`: lead, qualified, proposal, negotiation, won, lost
  - `activity_type`: note, call, meeting, email, instagram, linkedin, task
  - `task_status`: open, done

## Coding Conventions (Repo-Specific)
- Prefer server components for pages and data reads.
- Keep mutations in server actions (`"use server"`) and validate inputs with Zod.
- Gate write actions with `requireUser()`.
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
- On `/accounts`, keep the top area focused on a single add-account action panel plus the main account table.

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

## When Editing Existing Features
- If touching contact profile editing, preserve blur autosave behavior.
- If touching phone display, preserve `Call` button (`tel:` link behavior).
- If adding activity logging context, set `returnPath` so the page revalidates after submit.
- If adding/renaming routes, update top nav in `src/components/crm-shell.tsx`.
- If editing create/log forms, preserve the collapsible interaction pattern.
- If editing account stage selection, preserve immediate client-side feedback and the direct server-action update pattern in `AutoSaveCompanySelectField`.
- If editing the account create form on `/accounts`, keep it spacious and readable; do not collapse it back into a high-column cramped layout.

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
- If account stage touched: verify `/accounts` create flow and `/accounts/[id]` stage updates
- If opportunity workflow touched: verify `/opportunities/[id]` save + stage updates + timeline logging

## Safety Notes
- Do not store plaintext passwords; always hash with bcrypt (`bcryptjs`).
- Keep `AUTH_SECRET` and DB credentials in `.env.local` only.
- Preserve existing redirects from `/customers` to `/accounts` unless explicitly removing backward compatibility.

## Known Issues / Tech Debt
- Single-tenant data model: all authenticated users see all data; no per-user/org authorization boundaries yet.
- Contact-to-opportunity linking is partial: `deals.primaryContactId` is editable, but not consistently set in all create flows.
- Minimal error UX: server action validation failures generally throw; no structured inline form error states yet.
- Stage change guard for `lost` reason is soft (auto-fills "No reason provided."); no hard UI enforcement yet.
- Phone normalization assumes US numbers only; non-US formats are rejected.
- No test suite yet (unit/integration/e2e); quality relies on lint/build and manual verification.
