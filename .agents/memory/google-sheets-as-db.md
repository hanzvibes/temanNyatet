---
name: Google Sheets as app-data backend (TemanNyatet)
description: Single shared Google Spreadsheet with server-side user_id filtering; per-user spreadsheet creation failed due to Drive quota and permission issues.
---

TemanNyatet stores notes/transactions/todos/links in a **single shared Google Spreadsheet** (env: `GOOGLE_SHEETS_SPREADSHEET_ID`) while auth and `profiles` stay in Supabase.

**Architecture (current):**
- One spreadsheet shared by all users. All tabs have a `user_id` column.
- `sheet-store.ts` enforces isolation: `listByUser(spreadsheetId, sheetName, userId)` filters rows server-side; `updateRow`/`deleteRow` check `user_id` ownership before acting.
- `requireAuth.ts` reads `GOOGLE_SHEETS_SPREADSHEET_ID` from env — no Supabase lookup, no Drive calls.
- Service account must have **Editor** access to that spreadsheet (share via Google Sheets UI or Drive).

**Per-user spreadsheet approach was attempted and abandoned:**
- `sheets.spreadsheets.create` → 403 `PERMISSION_DENIED` even after enabling Sheets API.
- Switched to `drive.files.create` (mimeType `application/vnd.google-apps.spreadsheet`) → 403 `storageQuotaExceeded` (service account's Google Drive storage was full).
- Root cause: service account's Drive quota exhausted; fixing requires freeing Drive storage on the GCP account.
- Reverted to single shared spreadsheet to unblock users immediately.

**Gotchas:**
- Google service account key must be the **full JSON** (`{"type":"service_account",...}`), not just the PEM private key field.
- `id_ID` locale is not supported by the Sheets API — omit locale/timeZone when creating spreadsheets.
- DDL on Supabase: only via SQL Editor — no direct Postgres connection from Replit.
- `GOOGLE_SHEETS_SPREADSHEET_ID` must be shared with the service account's `client_email` as Editor.

**Why:**
User wanted per-user isolation, but Drive quota/permission issues on the service account made it unworkable in this environment. Single shared sheet with row-level user_id filtering provides equivalent logical isolation without Drive file creation.
