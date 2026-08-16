# 2026-04-24 Source Status

## Summary
Focused test run for Gmail, Google Drive, and Discord. Google Drive is now connected and searchable. No external write actions were taken.

## Gmail
- **Status:** Available connector, auth scope insufficient.
- **Query attempted:** `after:2026/04/24 before:2026/04/25`
- **Result count:** 0 usable messages.
- **Error:** Gmail API returned `403 PERMISSION_DENIED` with reason `ACCESS_TOKEN_SCOPE_INSUFFICIENT` for `gmail.googleapis.com` message listing.
- **Next step:** Reconnect Gmail and grant the read/search scope required to list and read messages.

## Google Drive
- **Status:** Available and authenticated as `justin@toprocklabs.com`.
- **Queries attempted:**
  - Recent documents, top 20.
  - `modifiedTime >= '2026-04-24T00:00:00' and modifiedTime < '2026-04-25T00:00:00' and mimeType != 'application/vnd.google-apps.folder'`
  - `createdTime >= '2026-04-24T00:00:00' and createdTime < '2026-04-25T00:00:00' and mimeType != 'application/vnd.google-apps.folder'`
- **Result count:** 13 recent documents visible; 0 files created today; 0 files modified today.
- **Documents read for content:** 7 files were fetched/read directly: Toprock service packaging, Kristy transcript, Surf n Sport transcript, Surf n Sport proposal, Coatary transcript, Terms of Service / MSA, and Mutual NDA.
- **Digest created:** `Drive/2026-04-24 Drive Digest.md`
- **Recent document signal:** Recent visible files include Toprock service packaging, Coatary signed proposal, Mutual NDA, Surf N Sport proposal files, transcripts, business budget, and Toprock LLC organization documents, all from earlier dates.
- **Next step:** Use the date-bounded Drive search in the nightly run. No Drive auth fix is needed based on this test.

## Discord
- **Status:** Connector unavailable in this Codex session.
- **Query attempted:** Connector discovery for Discord channel/message search tools.
- **Result count:** 0 messages.
- **Next step:** Install or expose a Discord MCP/app connector to Codex.

## External Write Safety
- No emails were sent, forwarded, archived, labeled, deleted, or drafted.
- No Google Drive files were created, edited, or deleted.
- No Discord messages were posted, edited, or deleted.
