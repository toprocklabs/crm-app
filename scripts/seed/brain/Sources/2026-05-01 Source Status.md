# 2026-05-01 Source Status

## Summary
Manual second-brain update run from `E:\Codex Projects\toprock_brain_scheduled_run_jt` for local date `2026-05-01` in `America/Denver`. Local Markdown files were created/updated inside `E:\Toprock Labs\toprock_brain`; no external systems were mutated.

## Connector Availability
- Granola: available.
- Gmail: available. Batch thread read returned an internal connector error, so messages were read individually.
- Google Drive: available.
- Discord: available via local read-only MCP server at `discord-second-brain-mcp/dist/index.js`.

## Queries And Counts
- Granola: listed meetings from `2026-05-01T00:00:00-06:00` to `2026-05-02T00:00:00-06:00`; 1 meeting found and read.
- Gmail: searched `after:2026/05/01 before:2026/05/02`; 3 message IDs found and 3 individual messages read.
- Google Drive: searched files modified in the May 1 local-day window; 10 results considered, with 2 meaningful Lightspeed log files and several unrelated dependency README files ignored. Also searched `Lightspeed` and `Scuba booking`; 1 recent Scuba transcript was reviewed for context.
- Discord: listed 5 allowed channels and fetched recent history from each: `coatary` 23, `general` 50, `sport-recruiting` 13, `thescubadive` 8, `vital-alignments` 0. One Discord message fell inside the May 1 local-day window.

## Gaps And Errors
- Gmail batch thread read failed with `'ModelPrivateAttr' object does not support the asynchronous context manager protocol`; individual reads worked.
- Google Drive surfaced synced/local development artifacts and package README files; these were treated as noise unless directly tied to Lightspeed or Scuba delivery.
- Drive `server.err.log` was visible but returned empty content.
- Sensitive auth artifacts were visible in source systems, including verification/setup links and OAuth authorization details. These were not copied into vault notes.

## External Write Confirmation
No Gmail, Google Drive, Granola, or Discord write actions were taken. Discord use was read-only: `list_channels` and `fetch_messages`.
