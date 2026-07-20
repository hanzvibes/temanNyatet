# TemanNyatet

A note-taking SaaS PWA for Indonesian users. Four core modules: Catatan (Notes), Keuangan (Finance), To Do List, and Link Saver. Mobile-first with bottom sheet patterns ("sat-set" UX).

## How to run

Two services run in parallel — both are already configured as workflows:

- **Frontend** (`artifacts/teman-nyatet: web`): `pnpm --filter @workspace/teman-nyatet run dev` — Vite dev server (defaults to 5173; on Replit it runs on port 5000 via the `PORT` env var)
- **API Server** (`artifacts/api-server: API Server`): `pnpm --filter @workspace/api-server run dev` — Express on port 8080

Replit normally remembers the last workflow state, so if the workflows were running when you left the project they should auto-start when you reopen it. If they ever appear stopped, restart them from the Workflows panel (or ask the agent to restart them).

## Required secrets

### Configured (required for core features)
- `VITE_SUPABASE_URL` — Supabase project URL (frontend)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (frontend)
- `SUPABASE_URL` — same value as `VITE_SUPABASE_URL` (API server)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (API server)
- `GOOGLE_CLIENT_ID` — OAuth2 client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — OAuth2 client secret from Google Cloud Console
- `GOOGLE_OAUTH_STATE_SECRET` — random hex string for HMAC-signing OAuth state params (prevents CSRF)
- `CRON_SECRET` — random string securing `/api/cron/archive-expired`

### Configured as env vars (non-secret)
- `GOOGLE_REDIRECT_URI` — OAuth callback URL registered in Google Cloud Console (`https://<dev-domain>/api/auth/google/callback`)
- `PORT` — `5000` (frontend Vite dev server)

### Optional / not configured
- `VITE_MAYAR_PAYMENT_URL` — Mayar payment page URL (frontend falls back to `#` if unset)
- `MAYAR_WEBHOOK_SECRET` — Mayar webhook signing secret (`/api/mayar-webhook` fails closed if unset)

### ⚠️ Pending action: Supabase migration
Run `supabase/migrations/004_add_google_oauth.sql` in the Supabase SQL Editor to add the `google_refresh_token` column to the `profiles` table. OAuth will fail without this.

## Stack

- **Frontend:** React 19 + Vite 7, TypeScript, Tailwind CSS 4, Wouter, Vaul, Recharts
- **Backend:** Express 5 (Mayar webhooks + cron jobs, and the notes/transactions/todos/links data API)
- **Auth:** Supabase Auth
- **App data (notes, transactions, todos, links):** Each user connects their Google Drive via OAuth. The backend auto-creates a Google Spreadsheet in the user's own Drive (using `drive.file` scope — least privilege). The spreadsheet ID is stored in `profiles.spreadsheet_id`; the OAuth refresh token in `profiles.google_refresh_token`. No service account needed — each API call uses the user's own OAuth token.
- **Subscription/profile data:** Supabase Postgres (`profiles` table).
- **Package manager:** pnpm 10.26.1 (monorepo)
- **Node.js:** 22

## Project structure

- `artifacts/teman-nyatet/` — React+Vite frontend SPA. `src/lib/apiClient.ts` calls the api-server (Bearer = Supabase access token) for notes/transactions/todos/links; `src/lib/supabase.ts` is used only for auth and the `profiles` table now. `src/pages/ConnectSheetPage.tsx` is the mandatory gate (route `/connect-sheet`) where users paste their spreadsheet link; also reachable from Settings to reconnect.
- `artifacts/api-server/` — Express API. Key files:
  - `src/lib/google-sheets.ts` — Sheets JWT client; `getServiceAccountEmail()` for the "share with this email" instructions
  - `src/lib/user-sheet.ts` — cached lookup of `profiles.spreadsheet_id` per user (no auto-create)
  - `src/lib/sheet-store.ts` — Generic CRUD with `user_id` row-level isolation; `listByUser` filters on server side; `ensureSheetsInitialized` creates tabs/headers on a newly connected spreadsheet. Also sanitizes formula-injection payloads before writing, serializes create/update/delete per spreadsheet+tab (`withSheetLock`) to prevent read-then-write races, and retries transient Google API errors (`withGoogleRetry`, from `google-sheets.ts`)
  - `src/middleware/requireAuth.ts` — `requireUser` (token only) vs `requireAuth` (token + resolves `req.spreadsheetId`, responds 428 `SPREADSHEET_NOT_CONNECTED` if unset)
  - `src/routes/spreadsheet.ts` — `GET /spreadsheet/status`, `POST /spreadsheet/connect` (validates access, rejects IDs already owned by another profile, rate-limited to 10 attempts/15min)
  - `src/routes/{notes,todos,links,transactions}.ts` — Data routes; validate/bound all input via `src/lib/validate.ts` (required/optional strings with max length, enums, http(s)-only URLs)
  - `src/app.ts` — `helmet()` security headers, configurable CORS allowlist (`ALLOWED_ORIGINS`), global rate limiting (300 req/15min/IP), 256kb JSON body limit
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
