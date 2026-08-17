# 2026-05-20 Source Status

## Summary
Manual second-brain update run from `E:\Codex Projects\toprock_brain_scheduled_run_jt` for local date `2026-05-20` in `America/Denver`. Local Markdown files were created/updated inside `E:\Toprock Labs\toprock_brain`; no external systems were mutated.

## Connector Availability
- Granola: available.
- Gmail: available.
- Google Drive: available.
- Discord: available via local read-only MCP server at `discord-second-brain-mcp/dist/index.js`.

## Queries And Counts
- Granola: listed meetings from `2026-05-20T00:00:00-06:00` to `2026-05-21T00:00:00-06:00`; 1 meeting found and read.
- Gmail: searched `after:2026/05/20 before:2026/05/21 -in:trash -in:spam`; 1 message/thread found and read. It was a Google Workspace promotional email, not a customer thread.
- Google Drive: searched files modified from `2026-05-20T00:00:00-06:00` to `2026-05-21T00:00:00-06:00`; 1 relevant document found and read with best-effort content fetch.
- Discord: listed 5 allowed channels and fetched recent history from each: `coatary` 23, `general` 100, `sport-recruiting` 15, `thescubadive` 37, `vital-alignments` 1. Total recent Discord messages considered: 176. Local-day Discord messages found: 1, in `vital-alignments`.

## Gaps And Errors
- The packaged `scripts\Run-ToprockNightlySecondBrain.ps1` runner failed immediately through the Codex CLI wrapper after a model-personality warning, before writing any dated vault files. This manual in-session update completed the run.
- Gmail had no meaningful customer/project email for the date range.
- Discord had only one same-day message in the allowed-channel history.
- Drive had one same-day relevant document; no broader recent fallback was needed.

## External Write Confirmation
No Gmail, Google Drive, Granola, or Discord write actions were taken. Discord use was read-only: `list_channels` and `fetch_messages`.
