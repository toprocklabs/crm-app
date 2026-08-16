# 2026-04-25 Source Status

## Summary
Nightly run completed for Granola, Gmail, Google Drive, and Discord. Granola and Google Drive were available and produced one overlapping meeting/document. Gmail was available but blocked by OAuth scope during the original run, then backfilled successfully. Discord was unavailable during the original run, then the local Discord MCP server was run successfully and backfilled on 2026-04-26. No external write actions were taken.

## Granola
- **Status:** Available.
- **Query:** custom range `2026-04-25T00:00:00-06:00` to `2026-04-26T00:00:00-06:00`.
- **Result count:** 1 meeting.
- **Meeting processed:** `AI tools and usage insights` at Apr 25, 2026 8:00 AM.
- **Meeting ID:** `b32b4351-4a56-4139-9e53-4c7a5aab8104`.
- **Files created/updated:** `Meetings/2026-04-25 AI Tools and Usage Insights.md`.

## Gmail
- **Status:** Available connector during original run, auth scope insufficient. Backfill on 2026-04-26 confirmed Gmail read/search access now works.
- **Query attempted:** `after:2026/04/25 before:2026/04/26`.
- **Original result count:** 0 usable messages.
- **Original error:** Gmail API returned `403 PERMISSION_DENIED` with reason `ACCESS_TOKEN_SCOPE_INSUFFICIENT` for `gmail.googleapis.com` message listing.
- **Backfill result:** The same April 25 date-bounded search returned 0 messages after reconnect. Recent business-relevant Gmail threads were captured in [[2026-04-26 Gmail Backfill]].

## Google Drive
- **Status:** Available.
- **Queries attempted:**
  - `modifiedTime >= '2026-04-25T00:00:00' and modifiedTime < '2026-04-26T00:00:00' and mimeType != 'application/vnd.google-apps.folder'`
  - `createdTime >= '2026-04-25T00:00:00' and createdTime < '2026-04-26T00:00:00' and mimeType != 'application/vnd.google-apps.folder'`
- **Result count:** 1 matching document, found in both created and modified searches.
- **Document read:** `Coatary Transcript 4/25`.
- **Files created/updated:** `Drive/2026-04-25 Drive Digest.md`.

## Discord
- **Status:** Unavailable during original run; local Discord MCP server available during 2026-04-26 backfill.
- **Original query attempted:** Connector discovery for Discord channel/message search tools.
- **Backfill tool:** `discord-second-brain-mcp` local STDIO server.
- **Channels reviewed:** `general`, `coatary`, `sport-recruiting`, `thescubadive`, `vital-alignments`.
- **Result count:** 128 messages fetched across 5 allowed channels.
- **Backfill file:** [[2026-04-26 Discord Backfill]].
- **Gaps:** Only latest 100 `general` messages fetched; attachment contents were not downloaded; `vital-alignments` had no readable messages.

## External Write Safety
- No emails were sent, forwarded, archived, labeled, deleted, or drafted.
- No Google Drive files were created, edited, or deleted.
- No Discord messages were posted, edited, deleted, or reacted to.
- Granola was read-only.
