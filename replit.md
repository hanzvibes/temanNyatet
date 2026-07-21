# TemanNyatet

A note-taking SaaS PWA for Indonesian users. Four core modules: Catatan (Notes), Keuangan (Finance), To Do List, and Link Saver. Mobile-first with bottom sheet patterns ("sat-set" UX). Each user stores their own data in a private Google Spreadsheet created automatically by the app.

## How to run

Two services run in parallel — both are already configured as workflows:

- **Frontend** (`artifacts/teman-nyatet: web`): `pnpm --filter @workspace/teman-nyatet run dev` — Vite dev server (defaults to 5173; on Replit it runs on port 5000 via the `PORT` env var)
- **API Server** (`artifacts/api-server: API Server`): `pnpm --filter @workspace/api-server run dev` — Express on port 8080

Replit normally remembers the last workflow state, so if the workflows were running when you left the project they should auto-start when you reopen it. If they ever appear stopped, restart them from the Workflows panel (or ask the agent to restart them).

## Required secrets

### Configured (required for core features)
- ✅ `VITE_SUPABASE_URL` — Supabase project URL (frontend)
- ✅ `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (frontend)
- ✅ `SUPABASE_URL` — same value as `VITE_SUPABASE_URL` (API server)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (API server)
- ✅ `GOOGLE_CLIENT_ID` — OAuth2 client ID from Google Cloud Console
- ✅ `GOOGLE_CLIENT_SECRET` — OAuth2 client secret from Google Cloud Console
- ✅ `GOOGLE_OAUTH_STATE_SECRET` — random hex string for HMAC-signing OAuth state params (prevents CSRF). **Required** — OAuth will fail closed if unset.
- ✅ `CRON_SECRET` — random string securing `/api/cron/archive-expired`

### Configured as env vars (non-secret)
- ✅ `GOOGLE_REDIRECT_URI` — OAuth callback URL registered in Google Cloud Console (`https://1ff676c6-37e0-4629-a8f7-15d4e4546a40-00-1gwr8wv8ub41m.sisko.replit.dev/api/auth/google/callback`)
- `PORT` — `5000` (frontend Vite dev server)

### Optional / not configured
- `VITE_MAYAR_PAYMENT_URL` — Mayar payment page URL (frontend falls back to `#` if unset)
- `MAYAR_WEBHOOK_SECRET` — Mayar webhook signing secret (`/api/mayar-webhook` fails closed if unset)

### ⚠️ Pending action: Supabase migration
Run the SQL files in `supabase/migrations/` in order in your Supabase SQL Editor:

1. `001_initial_schema.sql`
2. `002_add_profile_fields.sql`
3. `002_add_spreadsheet_id.sql`
4. `002_add_avatar_url.sql`
5. `003_template_tracking.sql`
6. `004_add_google_oauth.sql`
7. `005_phase1_schema.sql` — Phase 1 cleanup: adds sync tracking columns, drops unused legacy tables, and refreshes RLS policies.

OAuth and the data API will fail closed until the `google_refresh_token` column exists.

## Stack

- **Frontend:** React 19 + Vite 7, TypeScript, Tailwind CSS 4, Wouter, Vaul, Recharts, TanStack Query
- **Backend:** Express 5 (Mayar webhooks + cron jobs + notes/transactions/todos/links data API)
- **Auth:** Supabase Auth
- **App data (notes, transactions, todos, links):** Each user connects their Google Drive via OAuth. The backend auto-creates a Google Spreadsheet in the user's own Drive (using `drive.file` scope — least privilege). The spreadsheet ID is stored in `profiles.spreadsheet_id`; the OAuth refresh token in `profiles.google_refresh_token`. No service account needed — each API call uses the user's own OAuth token.
- **Subscription/profile data:** Supabase Postgres (`profiles` table).
- **API client:** Orval-generated from `lib/api-spec/openapi.yaml` into `lib/api-client-react` and `lib/api-zod`. Regenerate with `pnpm --filter @workspace/api-spec run codegen`.
- **Package manager:** pnpm 10.26.1 (monorepo)
- **Node.js:** 22

## Project structure

- `artifacts/teman-nyatet/` — React+Vite frontend SPA. `src/lib/apiClient.ts` calls the api-server (Bearer = Supabase access token) for notes/transactions/todos/links; `src/lib/supabase.ts` is used for auth and `profiles`. `src/pages/ConnectSheetPage.tsx` is the mandatory gate (`/connect-sheet`) for first-time Google OAuth.
- `artifacts/api-server/` — Express API. Key files:
  - `src/lib/google-oauth.ts` — OAuth2 client, state signing (HMAC, fails closed without secret)
  - `src/lib/user-sheet.ts` — cached lookup of `profiles.spreadsheet_id` + `google_refresh_token`; typed Google error classification
  - `src/lib/sheet-store.ts` — Generic CRUD with `user_id` row-level isolation; `ensureSheetsInitialized` creates tabs/headers; formula-injection sanitization; per-spreadsheet+tab in-process lock
  - `src/lib/google-sheets.ts` — retry helper, typed access errors
  - `src/middleware/requireAuth.ts` — `requireUser` (token only), `requireAuth` (token + resolves `req.spreadsheetId`), `userRateLimit` (per-user rate limiting)
  - `src/routes/auth-google.ts` — OAuth initiation/callback/disconnect/status
  - `src/routes/spreadsheet.ts` — `GET /spreadsheet/status`, `POST /spreadsheet/validate`, `POST /spreadsheet/repair`
  - `src/routes/{notes,todos,links,transactions}.ts` — Data routes with input validation
  - `src/app.ts` — `helmet()`, CORS, global + per-user rate limiting, JSON body limits
- `lib/api-spec/` — OpenAPI spec + generated API client (regenerate after any spec change)
- `supabase/migrations/` — DB schema for `profiles`

## Replit setup notes

- pnpm pinned to `10.26.1` (matching installed version) with `manage-package-manager-versions=false` in `.npmrc`
- Node.js 22 required — Supabase's realtime client needs native WebSocket (Node 22+)
- Vite config already has `host: 0.0.0.0` and `allowedHosts: true` for Replit proxy compatibility
- Originally deployed to Vercel — `vercel.json` files remain but are ignored on Replit

## User preferences

_Populate as you build._
