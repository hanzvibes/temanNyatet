---
name: Google Sheets Template Architecture
description: TemanNyatet per-user spreadsheet connector pattern — how template validation, archive-before-delete, and error recovery work.
---

# Google Sheets Template Architecture

## Rule
Each user connects their own copy of the Master Template Spreadsheet. The API server validates template authenticity via `_Metadata!template_id` before saving the spreadsheet_id to Supabase.

**Why:** Prevents users from connecting arbitrary spreadsheets with wrong schema; enables future template versioning and auto-migration.

**How to apply:** When `SPREADSHEET_TEMPLATE_ID` env var is set, `POST /api/spreadsheet/connect` reads `_Metadata!A1:B10` and rejects if `template_id` cell doesn't match. Skip validation in dev (env var unset).

## Sheet tabs
Data tabs: Notes, Transactions, Todos, Links, Journal
System tabs: `_Metadata` (template_id + template_version), `_Archive` (soft-deleted rows as JSON)

## Error recovery chain
`SheetsAccessError` (google-sheets.ts) → 503 from route → `SpreadsheetApiError` (apiClient.ts) → hook dispatches `teman-nyatet:spreadsheet-error` CustomEvent → AuthGuard in App.tsx redirects to `/connect-sheet?error=<code>`

## Archive-before-delete
`deleteRow()` in sheet-store.ts appends to `_Archive` tab before physical delete. Archive failure is logged but does NOT block delete.

## Repair endpoint
`POST /api/spreadsheet/repair` clears the `initializedSheets` cache and re-runs `ensureSheetsInitialized`, re-writing correct headers to all tabs.

## Pending user action
User must still:
1. Create the Master Template Spreadsheet manually (one-time dev task)
2. Add `_Metadata` tab with rows: `template_id | <UUID>` and `template_version | 1.0.0`
3. Set `SPREADSHEET_TEMPLATE_ID` and `VITE_SPREADSHEET_TEMPLATE_ID` env vars
