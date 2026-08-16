---
name: Coatary Product Selection Tool
status: in-progress
client: Coatary
tags: [project]
---

# Coatary Product Selection Tool

## Goal
Build and integrate an AI-powered product/system selection assistant that helps contractors and distributors choose Coatary products, quantities, best practices, and purchase-order-style outputs.

## Status
in-progress

## Notes Log
- 2026-04-25: Flint showed an early version built with Claude/API workflows and deployed through GitHub/Vercel. The tool gathers job details and can recommend product paths, but needs cleanup, UX tightening, architecture review, and website integration.
- 2026-04-26: Discord backfill captured a preview that merges Flint's Coaty agent with the Coatary website. The preview access issue was resolved, but the chat cannot work until the correct Claude API token or runtime credential path is available.

## Decisions
- Treat this as first-level contractor/distributor support and a key proof of concept for Coatary.

## Open Items
- [ ] Review repository and deployment setup.
- [ ] Clean up output verbosity and recommendation formatting.
- [ ] Add purchase-order-style output or export.
- [ ] Decide whether distributor access should be paid or simply gated.
- [ ] Connect the tool cleanly into the Coatary website.
- [ ] Get Flint's Claude API token or set up Toprock-owned runtime credentials.

## Related Meetings
- [[2026-04-25 AI Tools and Usage Insights]]
- [[2026-04-26 Discord Backfill]]
