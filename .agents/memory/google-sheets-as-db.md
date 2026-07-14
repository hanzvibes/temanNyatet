---
name: Google Sheets as app-data backend (TemanNyatet)
description: Per-user private Google Spreadsheets, connected by the user (not created by the service account); why auto-creation is a dead end here.
---

TemanNyatet stores notes/transactions/todos/links in **each user's own private Google Spreadsheet** (`profiles.spreadsheet_id`), while auth and `profiles` stay in Supabase.

**Architecture (current):**
- Each user creates their own spreadsheet, shares it with the service account's `client_email` as Editor, then pastes the link/ID into the app at a mandatory post-login gate. No auto-creation.
- `routes/spreadsheet.ts` validates access via `sheets.spreadsheets.get` before saving, rejects spreadsheet IDs already owned by another profile, then calls `ensureSheetsInitialized` to create the tab/header structure.
- `requireAuth` middleware resolves the caller's spreadsheet from `profiles.spreadsheet_id` (cached ~1min in `user-sheet.ts`) and 428s if not connected yet — enforced independently of the frontend gate.
- Sync is just polling (frontend hooks refetch every 15s) + synchronous writes on every mutation — no push/webhook layer needed.

**Why not auto-create per-user spreadsheets via the service account:**
- Newly created Google service accounts get **0 bytes of Drive storage quota** — `sheets.spreadsheets.create` and `drive.files.create` both fail (`PERMISSION_DENIED` / `storageQuotaExceeded`) no matter what APIs are enabled. This is a Google platform limitation, not a code bug, and isn't fixable by config.
- This was tried and reverted once already (first as create-in-shared-sheet, then per-user auto-create) before landing on "user connects their own sheet" — if a future attempt reconsiders auto-creation, check whether Google has changed this Drive quota policy first; as of 2026-07-13 it still applies.
- Connecting a user-owned sheet sidesteps the quota entirely because the file lives in the *user's* Drive, not the service account's.

**Security hardening (2026-07-14):** since each sheet is a real file the user opens/exports themselves, `sheet-store.ts` now prefixes any user-supplied string starting with `=+-@`/tab/CR with `'` before writing (defense against CSV/formula injection if the user later exports to Excel/LibreOffice — `RAW` value input option means Sheets itself never executes it, but a downstream export/reopen or manual re-edit can). `createRow`/`updateRow`/`deleteRow` are also serialized per spreadsheet+sheet-tab via an in-process async lock (`withSheetLock`) since they're read-row-index-then-write and Sheets has no transactions — sufficient for a single server instance only; revisit with a shared lock if ever scaled horizontally.

**Gotchas:**
- Google service account key must be the **full JSON** (`{"type":"service_account",...}`), not just the PEM private key field.
- `id_ID` locale is not supported by the Sheets API — omit locale/timeZone when creating spreadsheets.
- DDL on Supabase: only via SQL Editor — no direct Postgres connection from Replit.
- Existing users' old data in the legacy shared spreadsheet is **not** auto-migrated when they connect their own sheet — this was an explicit accepted tradeoff, not an oversight.
