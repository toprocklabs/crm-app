---
title: 2026-05-10 Code Weekly Digest
date: 2026-05-10
type: code-digest
author: Austin
author_github: a9austin
contributors: [Austin]
source: Claude Code weekly Code ingest
source_dir: C:\Users\a9aus\Dev\truong-dynasty\toprock-labs-brain-scheduled-run
generated_at: 2026-05-10T04:25:00-06:00
range_start: 2026-05-04
range_end: 2026-05-10
---

# 2026-05-10 Code Weekly Digest

> **Author:** [[Austin]] · **Source:** Claude Code weekly Code ingest · **Range:** 2026-05-04 → 2026-05-10 · **Generated:** 2026-05-10 04:25 MDT

## Summary
Heavy build week across two delivery threads: (1) the [[The Scuba Dive Website and Automation]] booking wizard went from partial to fully wired end-to-end (count → schedule → register/profile → review → pay → confirm → digital paperwork), plus a Class CMS Phase 2.A sprint and a marketing landing-page rebuild from mockup-06; (2) a brand-new `athletic-spotlight-intake-form` repo for Showcase / Timpview Football was scaffolded, wired to Neon/Postgres, and PIN-gated. The [[The Scuba Dive Website and Automation]] waiver app (`signature_consent_form`) had a multi-attempt Neon ↔ Vercel database integration shake-out plus admin UX polish. One small [[Sport Recruiting Multi-School Platform]] tweak landed (jersey number on prospect cards). This is the first week the Code ingest is operating, so there is no prior digest to compare against.

## Date Range
`2026-05-04` through `2026-05-10` (America/Denver)

## GitHub — toprocklabs

### the_scuba_dive_riverton_web
**Project:** [[The Scuba Dive Website and Automation]] · **Company:** [[The Scuba Dive Riverton]]

**Commits (14)**
- `7533afb3` Wire schedule step into booking wizard ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/7533afb3c335520a53149e6f673ce438b4a96c15))
- `248d71b4` Add design spec for booking wizard count step ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/248d71b4c57d533f5a2025861fb6c81cca0ae1f1))
- `2ec7535a` Wire count step into booking wizard ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/2ec7535abb6143eacad3c8bd67c1e0ee2bf71a97))
- `a7a6d981` Add design spec for booking wizard register step (Phase 3a, profile) ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/a7a6d981684ccdf472165c061f08ffaa58cb2233))
- `ca375e05` Wire register step (profile slice) into booking wizard ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/ca375e052c8d4c7f0f09e392955939e7b5acdcef))
- `ec29a8ac` Use db.batch for register insert (neon-http has no transactions) ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/ec29a8ace5978415dc00a131159c2af2ea4455c6))
- `dbffdc46` Add design spec for booking wizard review step ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/dbffdc465baca3535e9de8e877519b6530961f92))
- `a5fce601` Wire review step into booking wizard ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/a5fce601f5a3c0ff4b9ba7fdf1c7c4f94e588498))
- `b3979d09` Preserve register form values on validation error ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/b3979d099c3b5ae36568674c000ed113796f72cf))
- `d41ab9da` Wire pay and confirm steps into booking wizard ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/d41ab9daaa3c2e7a8177c9e69bcfc82b431d91a5))
- `ff249fd7` Add digital paperwork step to booking wizard ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/ff249fd7c9216e7aadf26a6dcc6623debdff817a))
- `ff6ddee9` Add Class CMS sprint spec and tighten seed exports ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/ff6ddee9cc92be9107cc2ccb516ddb7627d2afdd))
- `f51a296a` Implement Class CMS Phase 2.A sprint ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/f51a296aee502c681ad31fee4c1f7e1bf60fd154))
- `cf5587c6` Rebuild marketing landing page from mockup-06 ([link](https://github.com/toprocklabs/the_scuba_dive_riverton_web/commit/cf5587c67119efa8b2b4dfe60181976a88d82f1d))

**PRs:** none opened/merged/updated this week.

**Notes**
- Booking wizard is now fully wired end-to-end from count selection through digital paperwork.
- Schema constraint surfaced: `neon-http` driver has no transactions — register insert switched to `db.batch`.
- Class CMS sprint (Phase 2.A) shipped same day as a marketing landing-page rebuild from `mockup-06`.

### signature_consent_form
**Project:** [[The Scuba Dive Website and Automation]] (waiver app) · **Company:** [[The Scuba Dive Riverton]]

**Commits (9)**
- `439d7a87` Use Neon serverless driver adapter for Prisma ([link](https://github.com/toprocklabs/signature_consent_form/commit/439d7a8781d019019b9df2ef8eb08543b85eaed3))
- `ecf67570` Drop prisma db push from build script ([link](https://github.com/toprocklabs/signature_consent_form/commit/ecf67570c8b3dd3b161a6995888c7329a8d4f30e))
- `e611c102` Revert Neon driver adapter; back to default Prisma TCP client ([link](https://github.com/toprocklabs/signature_consent_form/commit/e611c102dcb55f20061e16071d23c4306dd4c880))
- `6cd80a5c` Trigger redeploy after DATABASE_URL env update ([link](https://github.com/toprocklabs/signature_consent_form/commit/6cd80a5c9518ddda0b8d41255b1df6d9f75ca1ec))
- `bc66b617` Trigger redeploy after DATABASE_URL params + password rotation ([link](https://github.com/toprocklabs/signature_consent_form/commit/bc66b617b153bd6d03feb49e10365988042fd923))
- `09248f3c` Use Vercel/Neon integration env vars + add data migration script ([link](https://github.com/toprocklabs/signature_consent_form/commit/09248f3caef1fbf99c917227bc72f74dbe67d8c2))
- `56101358` Use Neon-Vercel integration's actual env-var names ([link](https://github.com/toprocklabs/signature_consent_form/commit/56101358abfd19dd0727640f41971865498b97d6))
- `7cdaa387` Add child-name sorting to admin event submissions list ([link](https://github.com/toprocklabs/signature_consent_form/commit/7cdaa387c6cbf06d348277c6f8075b3cf9235da6))
- `c3eac832` Make submissions search filter live as you type ([link](https://github.com/toprocklabs/signature_consent_form/commit/c3eac832ccce4fbad1d42774fb5965719ecbf41a))

**PRs:** none.

**Notes**
- Multi-step Neon ↔ Vercel database integration: tried the Neon serverless driver adapter, reverted to default Prisma TCP, ultimately settled on Vercel/Neon integration env vars (`DATABASE_PRISMA_URL` pooled + `DATABASE_URL_NON_POOLING` for `prisma db push`). One detailed commit body documents the rationale for keeping pooled and direct URLs split.
- Added a one-shot Prisma-based `scripts/migrate-data.mjs` that copies `Event` and `Submission` rows between databases via id-preserving upsert, without touching unrelated tables in the source.
- Admin UX: added child-name sort + live search filter on the event submissions list.

### athletic-spotlight-intake-form
**Project:** [[Sport Recruiting Multi-School Platform]] (Showcase / Timpview Football intake)

**Commits (6)**
- `107e4797` Initial commit: Showcase Field Pass intake form ([link](https://github.com/toprocklabs/athletic-spotlight-intake-form/commit/107e4797deaf42f88d5752b3d3cf8ba7997d7e04))
- `5442d083` Wire submissions to Vercel Postgres / Neon ([link](https://github.com/toprocklabs/athletic-spotlight-intake-form/commit/5442d083c8d78f05e64ab175e6ee0d2695d4111e))
- `0fe9a962` Add .js extension to ../lib/db imports in API routes ([link](https://github.com/toprocklabs/athletic-spotlight-intake-form/commit/0fe9a96228bff42cb69998c38d7d377b3fec99f6))
- `376c548a` Add 4-digit PIN gate to the admin/gate console ([link](https://github.com/toprocklabs/athletic-spotlight-intake-form/commit/376c548a6fdb532aaf390898fab1a4c57a7a863a))
- `5b12a5a6` Rename event eyebrow to Timpview Football Showcase ([link](https://github.com/toprocklabs/athletic-spotlight-intake-form/commit/5b12a5a6c96148e129b26dc33c6b8462f89308e7))
- `490be047` Add sort to gate console submissions ([link](https://github.com/toprocklabs/athletic-spotlight-intake-form/commit/490be0479bfc3297e3aaa8e0b544dc1bb6326fcc))

**PRs:** none.

**Notes**
- New repo this week — Showcase Field Pass intake form, branded for the Timpview Football Showcase.
- Submissions stored in Vercel Postgres / Neon. Admin/gate console gated behind a 4-digit PIN with sortable submissions.

### sport-recruiting-site
**Project:** [[Sport Recruiting Multi-School Platform]]

**Commits (1)**
- `bcdf634b` feat: show jersey number on prospect cards + sort by jersey in All Classes ([link](https://github.com/toprocklabs/sport-recruiting-site/commit/bcdf634bacd22c507f9de79157126a96a241c931))

**PRs:** none.

## Claude Code Sessions (Toprock-related)

> All seven captured Claude Code sessions are dated **2026-05-10**. Earlier days in this window had toprocklabs commits but no Claude Code sessions in `~/.claude/projects` for them — those commits were almost certainly authored from a different agent (e.g. the Codex CLI run) or directly. Going forward this digest will catch new Claude Code work as it lands.

### dive-shop-riverton-v2
**Project:** [[The Scuba Dive Website and Automation]] · **Company:** [[The Scuba Dive Riverton]]
**Sessions:** 3 · **Approx. session size:** ~2.8 MB combined

The week's Claude Code work on this repo started with a `git pull`, ran a localhost-restart-and-test cycle, then opened a planning thread to rebuild the landing page to match `mockup-06-merged` (less class-process-only, more like the mockup's main page). The 2026-05-10 commits to `the_scuba_dive_riverton_web` (Class CMS sprint spec, Phase 2.A implementation, marketing landing-page rebuild) line up with this session work.

**Files edited (sample, summarized)**
- Class CMS sprint spec + Phase 2.A implementation files
- Landing page rebuild from mockup-06

### leads-south-pointe-dental-site
**Project:** [[South Pointe Dental Website]] · **Company:** [[South Pointe Dental]]
**Sessions:** 1 · **Approx. session size:** ~669 KB

User asked Claude to execute a "Suggested Two-Week Build" sprint plan — sprint-driven build out of the South Pointe Dental site. Did not produce commits to a `toprocklabs` repo this week; output likely lives locally pending a push.

### signature-consent-form
**Project:** [[The Scuba Dive Website and Automation]] (waiver app) · **Company:** [[The Scuba Dive Riverton]]
**Sessions:** 1 · **Approx. session size:** ~97 KB

Brief — `git pull` to sync the local checkout with the week's Neon/Vercel and admin-UX commits.

### toprock-brain
**Project:** (meta — brain self-edit) · **Company:** [[Toprock CRM]] (only loosely)
**Sessions:** 1 · **Approx. session size:** ~24 KB

User pulled `https://github.com/toprocklabs/toprock_brain` into a local folder. Setup work on the brain itself; no substantive notes added in that session.

### toprock-labs-brain-scheduled-run
**Project:** (meta — this scheduled-run worktree being created)
**Sessions:** 1 (in progress) · **Approx. session size:** ~309 KB and growing

This very session: setting up the Claude Code-driven weekly Code ingest into the brain — `CLAUDE.md`, `prompts/weekly-ingest-prompt.md`, `.claude/commands/ingest-weekly.md`, `run-weekly-ingest.ps1`, `README.md`, plus this inaugural digest. The Windows Task Scheduler task `ToprockBrain-CodeIngest-Weekly` (Sunday 18:00 America/Denver) was prepared but not yet installed — see `Sources/2026-05-10 Code Source Status.md` for details.

## Cross-Links
- [[The Scuba Dive Website and Automation]]
- [[The Scuba Dive Riverton]]
- [[Sport Recruiting Multi-School Platform]]
- [[South Pointe Dental Website]]
- [[South Pointe Dental]]
- [[Toprock CRM]]

## Gaps
- No PRs opened, merged, or updated in the toprocklabs org this week. (Direct-to-main push flow appears to be the working pattern.)
- Claude Code sessions captured by this run are all from 2026-05-10 only — earlier-week commits exist but are not represented in the Claude Code section. If those were authored from the Codex CLI, they'll appear in the daily Codex run's notes; if not, future Code Ingest runs will close that gap as new Claude Code sessions occur.
- Per-session "files edited" lists were not deeply enumerated in this inaugural run; future runs should parse `Edit`/`Write` tool calls per-session for richer per-project file lists.
- This is the first weekly Code digest — no prior week to diff against.
