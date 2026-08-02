---
name: PostgreSQL primary architecture
description: Data store refactor — postgres is the only data source; Google Sheets is optional backup. Documents the middleware split and key files.
---

# PostgreSQL Primary Architecture

## The rule
PostgreSQL is the **only** data store for all app data (notes, transactions, todos, links). Google Sheets is an **optional** backup/restore feature. The app must work fully without Google connected.

**Why:** The old default was `APP_DATA_STORE=sheets`, which caused "Gagal mengambil catatan" errors for users who hadn't connected Google OAuth.

## How to apply
- `lib/data-store.ts` — no longer has a mode switch. All functions call `postgresRepository` directly. No sheet params.
- `middleware/requireAuth.ts` — two distinct middlewares:
  - `requireAuth` = alias for `requireUser` (token verification only, no Sheets lookup)
  - `requireSheetConnection` — resolves Google Sheets client; used ONLY for backup routes (spreadsheet repair/validate); returns 428 if Google not connected
- Data routes (notes, transactions, todos, links, transaction-summary) use `requireAuth`.
- Backup routes (`/spreadsheet/repair`, `/spreadsheet/validate`) use `requireSheetConnection`.
- `/spreadsheet/status` always returns `dataReady: true` and `dataStore: "postgres"`.

## Key files changed
- `artifacts/api-server/src/lib/data-store.ts`
- `artifacts/api-server/src/middleware/requireAuth.ts`
- `artifacts/api-server/src/routes/notes.ts` (+ transactions, todos, links, transaction-summary, spreadsheet)
- `artifacts/teman-nyatet/src/lib/apiClient.ts`
- `artifacts/teman-nyatet/src/hooks/useNotes.ts`
