---
name: Sport Recruiting Multi-School Platform
status: active
client:
tags: [project]
---

# Sport Recruiting Multi-School Platform

## Goal
Build a recruiting website/platform that can support schedules, admin editing, and multiple schools with light customization per school.

## Status
active

## Notes Log
- 2026-04-26: Discord backfill captured a schedule feature pushed for the Travis site: season/spring ball handling, database-backed schedules, and per-season admin editing.
- 2026-04-26: Discord backfill captured a branch that supports multiple schools and a preview URL, with remaining work around additional school scraping, customizations, auth, and coach registration.

## Decisions
- Move the project toward a multi-school architecture rather than a one-off school site.
- Keep per-school custom edits possible without forking the product too heavily.

## Open Items
- [ ] Scrape Springville and Maple Mountain.
- [ ] Design the architecture for slight per-school customizations.
- [ ] Verify admin works with new user auth.
- [ ] Create a process for coaches to register.

## Related Meetings
- [[2026-04-26 Discord Backfill]]
