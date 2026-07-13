# TemanNyatet

A note-taking SaaS PWA for Indonesian users. Four core modules: Catatan (Notes), Keuangan (Finance), To Do List, and Link Saver. Mobile-first with bottom sheet patterns ("sat-set" UX).

## How to run

Two services run in parallel — both are already configured as workflows:

- **Frontend** (`artifacts/teman-nyatet: web`): `pnpm --filter @workspace/teman-nyatet run dev` — Vite dev server (defaults to 5173; on Replit it runs on port 5000 via the `PORT` env var)
- **API Server** (`artifacts/api-server: API Server`): `pnpm --filter @workspace/api-server run dev` — Express on port 8080

## Required secrets

These secrets are configured in Replit Secrets for the current environment (re-added 2026-07-13 after project re-import). The app is running without Mayar.

### Configured (required for core features)
- `VITE_SUPABASE_URL` — Supabase project URL (frontend)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (frontend)
- `SUPABASE_URL` — same value as `VITE_SUPABASE_URL` (API server)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (API server)
- `GOOGLE_SERVICE_ACCOUNT_KEY` — full JSON key file content for a Google Cloud service account with the Sheets API enabled
- `GOOGLE_SHEETS_SPREADSHEET_ID` — legacy shared spreadsheet from before the per-user-spreadsheet migration; no longer read by the app at runtime, kept only so old data isn't lost. See "App data" below.

### Optional / not configured
- `VITE_MAYAR_PAYMENT_URL` — Mayar payment page URL (frontend falls back to `#` if unset)
- `MAYAR_WEBHOOK_SECRET` — Mayar webhook signing secret (`/api/mayar-webhook` fails closed if unset)
- `CRON_SECRET` — any random string to secure the cron endpoint (`/api/cron/archive-expired` fails closed if unset)

## Stack

- **Frontend:** React 19 + Vite 7, TypeScript, Tailwind CSS 4, Wouter, Vaul, Recharts
- **Backend:** Express 5 (Mayar webhooks + cron jobs, and the notes/transactions/todos/links data API)
- **Auth:** Supabase Auth (unchanged)
- **App data (notes, transactions, todos, links):** Each user connects their own private Google Spreadsheet (pasted URL/ID, shared with the service account as Editor) via a mandatory `/connect-sheet` step right after login. The ID is stored in `profiles.spreadsheet_id`. No auto-creation — the service account cannot create/own Drive files (0-byte quota on new service accounts), so "connect an existing sheet the user owns" replaces the earlier shared-spreadsheet model. Old shared-spreadsheet data (`GOOGLE_SHEETS_SPREADSHEET_ID`) is not auto-migrated.
- **Subscription/profile data:** Supabase Postgres (`profiles` table, includes `spreadsheet_id`).
- **Package manager:** pnpm 10.26.1 (monorepo)
- **Node.js:** 22

## Project structure

- `artifacts/teman-nyatet/` — React+Vite frontend SPA. `src/lib/apiClient.ts` calls the api-server (Bearer = Supabase access token) for notes/transactions/todos/links; `src/lib/supabase.ts` is used only for auth and the `profiles` table now. `src/pages/ConnectSheetPage.tsx` is the mandatory gate (route `/connect-sheet`) where users paste their spreadsheet link; also reachable from Settings to reconnect.
- `artifacts/api-server/` — Express API. Key files:
  - `src/lib/google-sheets.ts` — Sheets JWT client; `getServiceAccountEmail()` for the "share with this email" instructions
  - `src/lib/user-sheet.ts` — cached lookup of `profiles.spreadsheet_id` per user (no auto-create)
  - `src/lib/sheet-store.ts` — Generic CRUD with `user_id` row-level isolation; `listByUser` filters on server side; `ensureSheetsInitialized` creates tabs/headers on a newly connected spreadsheet
  - `src/middleware/requireAuth.ts` — `requireUser` (token only) vs `requireAuth` (token + resolves `req.spreadsheetId`, responds 428 `SPREADSHEET_NOT_CONNECTED` if unset)
  - `src/routes/spreadsheet.ts` — `GET /spreadsheet/status`, `POST /spreadsheet/connect` (validates access, rejects IDs already owned by another profile)
  - `src/routes/{notes,todos,links,transactions}.ts` — Data routes
- `lib/api-spec/` — OpenAPI spec + generated API client
- `lib/db/` — shared DB types
- `supabase/migrations/` — DB schema for `profiles`

## Replit setup notes

- pnpm pinned to `10.26.1` (matching installed version) with `manage-package-manager-versions=false` in `.npmrc`
- Node.js 22 required — Supabase's realtime client needs native WebSocket (Node 22+)
- Vite config already has `host: 0.0.0.0` and `allowedHosts: true` for Replit proxy compatibility
- Originally deployed to Vercel — `vercel.json` files remain but are ignored on Replit

## User preferences

_Populate as you build._
