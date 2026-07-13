---
name: Google Sheets as app-data backend (TemanNyatet)
description: Per-user private Google Spreadsheets; service account creates/manages them; spreadsheet_id stored in Supabase profiles.
---

TemanNyatet stores notes/transactions/todos/links in **per-user private Google Spreadsheets** (via the api-server only) while auth and the `profiles`/subscription table stay in Supabase.

**Architecture (post-refactor):**
- Each user gets their own Google Spreadsheet, created automatically on first login by the api-server.
- The spreadsheet ID is stored in `profiles.spreadsheet_id` (Supabase Postgres).
- The service account (GOOGLE_SERVICE_ACCOUNT_KEY) creates and owns all user spreadsheets.
- `GOOGLE_SHEETS_SPREADSHEET_ID` env var is no longer needed — removed from architecture.
- Key files: `google-sheets.ts` (client + createUserSpreadsheet), `user-sheet.ts` (getOrCreateUserSpreadsheet with 5-min TTL cache), `sheet-store.ts` (CRUD with spreadsheetId as first param), `requireAuth.ts` (attaches req.userId + req.spreadsheetId).

**DB migration required:**
`supabase/migrations/002_add_spreadsheet_id.sql` must be run in Supabase SQL Editor:
```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS spreadsheet_id TEXT;
```
No `DATABASE_URL`/direct Postgres connection available — DDL must always go through Supabase SQL Editor this way.

**Gotchas:**
- Google service account credential must be the **entire** JSON key file (`{"type":"service_account",...}`), not just the `private_key` PEM field.
- Sheets has no realtime push — frontend polls every 15s.
- Per-user isolation: since the spreadsheet is private per-user, no in-memory user_id filter is needed in reads (all rows belong to the owner). user_id is still written to rows for auditability.
- DDL on Supabase: only via SQL Editor — write migrations as files, ask user to run them once.
