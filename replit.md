# TemanNyatet

A note-taking SaaS PWA for Indonesian users. Four core modules: Catatan (Notes), Keuangan (Finance), To Do List, and Link Saver. Mobile-first with bottom sheet patterns ("sat-set" UX).

## How to run

Two services run in parallel — both are already configured as workflows:

- **Frontend** (`artifacts/teman-nyatet: web`): `pnpm --filter @workspace/teman-nyatet run dev` — Vite dev server on port 5000
- **API Server** (`artifacts/api-server: API Server`): `pnpm --filter @workspace/api-server run dev` — Express on port 8080

## Required secrets

The app will not connect to Supabase or Mayar without these. Add them via Replit Secrets:

### Frontend
- `VITE_SUPABASE_URL` — your Supabase project URL (e.g. `https://xyz.supabase.co`)
- `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key
- `VITE_MAYAR_PAYMENT_URL` — your Mayar payment page URL

### API Server
- `SUPABASE_URL` — same value as `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service role key (keep secret!)
- `MAYAR_WEBHOOK_SECRET` — Mayar webhook signing secret
- `CRON_SECRET` — any random string to secure the cron endpoint
- `GOOGLE_SERVICE_ACCOUNT_KEY` — full JSON key file content for a Google Cloud service account with the Sheets API enabled (not just the private key)
- `GOOGLE_SHEETS_SPREADSHEET_ID` — the spreadsheet ID that stores notes/transactions/todos/links; share the sheet with the service account's `client_email` as Editor

## Stack

- **Frontend:** React 19 + Vite 7, TypeScript, Tailwind CSS 4, Wouter, Vaul, Recharts
- **Backend:** Express 5 (Mayar webhooks + cron jobs, and the notes/transactions/todos/links data API)
- **Auth:** Supabase Auth (unchanged)
- **App data (notes, transactions, todos, links):** Each user gets their own private Google Spreadsheet, created automatically on first login. The spreadsheet ID is stored in `profiles.spreadsheet_id`. The service account creates and manages all user spreadsheets. Data is fully isolated — no shared spreadsheet.
- **Subscription/profile data:** Supabase Postgres (`profiles` table) — includes `spreadsheet_id` column added in migration 002.
- **Package manager:** pnpm 10.26.1 (monorepo)
- **Node.js:** 22

## Project structure

- `artifacts/teman-nyatet/` — React+Vite frontend SPA. `src/lib/apiClient.ts` calls the api-server (Bearer = Supabase access token) for notes/transactions/todos/links; `src/lib/supabase.ts` is used only for auth and the `profiles` table now.
- `artifacts/api-server/` — Express API. Key files:
  - `src/lib/google-sheets.ts` — Sheets client + `createUserSpreadsheet()`
  - `src/lib/user-sheet.ts` — `getOrCreateUserSpreadsheet()` with in-memory TTL cache; called by requireAuth
  - `src/lib/sheet-store.ts` — Generic CRUD over a per-user spreadsheet ID
  - `src/middleware/requireAuth.ts` — Verifies JWT, attaches `req.userId` + `req.spreadsheetId`
  - `src/routes/{notes,todos,links,transactions}.ts` — Data routes, each uses `req.spreadsheetId`
- `lib/api-spec/` — OpenAPI spec + generated API client
- `lib/db/` — shared DB types
- `supabase/migrations/` — DB schema (migration 002 adds `spreadsheet_id` to `profiles`)

## Replit setup notes

- pnpm pinned to `10.26.1` (matching installed version) with `manage-package-manager-versions=false` in `.npmrc`
- Node.js 22 required — Supabase's realtime client needs native WebSocket (Node 22+)
- Vite config already has `host: 0.0.0.0` and `allowedHosts: true` for Replit proxy compatibility
- Originally deployed to Vercel — `vercel.json` files remain but are ignored on Replit

## User preferences

_Populate as you build._
