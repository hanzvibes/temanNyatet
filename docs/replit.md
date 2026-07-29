# TemanNyatet

A note-taking SaaS PWA for Indonesian users. Four core modules: Catatan (Notes), Keuangan (Finance), To Do List, and Link Saver. Mobile-first with bottom sheet patterns ("sat-set" UX). Each user stores their own data in a private Google Spreadsheet created automatically by the app in their own Google Drive via OAuth2.

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| ENVIRONMENT — all env vars & secrets | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| DEPLOYMENT — Vercel deployment runbook | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| TROUBLESHOOTING — Replit-specific issues | [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) |
| AUTH — Google OAuth setup for Replit | [`AUTH.md`](./AUTH.md) |
| docs/SUPABASE-SETUP.md — DB setup | [`docs/SUPABASE-SETUP.md`](./SUPABASE-SETUP.md) |

## How to run

Two services are configured as Replit workflows and will auto-start:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/teman-nyatet: web` | `PORT=5000 pnpm --filter @workspace/teman-nyatet run dev` | 5000 |
| `artifacts/api-server: API Server` | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 |

Each workflow has its port pinned explicitly in the command, so there is no port conflict between the two services. The Vite dev server proxies `/api/*` → `localhost:8080`, meaning both services share one origin in the browser.

## Required secrets

The API server requires these values for its core auth and data paths:

- `VITE_SUPABASE_URL` — Supabase project URL (frontend)
- `VITE_SUPABASE_ANON_KEY` — Supabase anon/public key (frontend)
- `SUPABASE_URL` — same value as `VITE_SUPABASE_URL` (API server)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (API server)
- `GOOGLE_CLIENT_ID` — OAuth2 client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — OAuth2 client secret from Google Cloud Console
- `GOOGLE_OAUTH_STATE_SECRET` — random hex string for HMAC-signing OAuth state params (prevents CSRF). **Required** — OAuth will fail closed if unset.

### Optional / not strictly required

- `OPENAI_API_KEY` — API key for note summarization (AI feature). If unset, `POST /api/notes/:id/summarize` returns `503`. Defaults to SumoPod-compatible endpoint.
- `INITIAL_AI_CREDITS` — initial AI summarization balance for new users; defaults to `10`. Keep aligned with Supabase `app.initial_ai_credits`.
- `CRON_SECRET` — random string securing `/api/cron/archive-expired`; the cron route returns an error when it is missing.
- `MAYAR_WEBHOOK_SECRET` — Mayar webhook signing secret (`/api/mayar-webhook` fails closed if unset)
- `VITE_MAYAR_PAYMENT_URL` — Mayar payment page URL (frontend falls back to `#` if unset)
- `VITE_API_SERVER_URL` — set to `https://teman-nyatet-api-server.vercel.app` for the Vercel frontend project. Leave unset in Replit dev because the Vite proxy handles `/api` → `localhost:8080`; production also has this URL as a fallback.
- `GOOGLE_REDIRECT_URI` — OAuth callback URL registered in Google Cloud Console. **Pre-configured**: this is set as a `[userenv.shared]` variable in `.replit` (not a Secret) pointing to the current workspace's dev domain. You only need to register this URI in Google Cloud Console. On Vercel production, set it explicitly as `https://teman-nyatet-api-server.vercel.app/api/auth/google/callback`.
- `FRONTEND_URL` — used by the API server when redirecting the browser after OAuth callback (defaults to `https://<REPLIT_DEV_DOMAIN>` or `http://localhost:5000` if unset)
- `ALLOWED_ORIGINS` — comma-separated CORS allowlist (defaults to allow all origins when unset)
- `PORT` — both services have their port pinned in the workflow command (`PORT=5000` for frontend, `PORT=8080` for API server). No longer set in `[userenv.shared]`.
- `LOG_LEVEL` — defaults to `info`

## Supabase migration

Run the SQL files in `supabase/migrations/` in order in your Supabase SQL Editor. The exact order depends on whether the project was created before or after the column additions, because there are multiple files named `002_*`:

1. `001_initial_schema.sql`
2. `002_add_profile_fields.sql` (adds `name`, `phone`, `avatar_url`)
3. `002_add_spreadsheet_id.sql` (adds `spreadsheet_id`)
4. `002_add_avatar_url.sql` (also adds `avatar_url`; idempotent, safe to run even after `002_add_profile_fields.sql`)
5. `003_template_tracking.sql` (adds `template_version`; optional legacy table drops are commented out)
6. `004_add_google_oauth.sql` (adds `google_refresh_token`)
7. `005_phase1_schema.sql` — Phase 1 cleanup: adds sync tracking columns (`last_sync_at`, `sync_status`, `recovery_metadata`), drops legacy `notes`, `transactions`, `todos`, `links` tables, and refreshes RLS policies.
8. `006_ai_credits.sql` — adds AI credit balances, immutable ledger, signup trigger, and atomic RPCs.

If you encounter `infinite recursion detected in policy for relation "profiles"`, also run `supabase/migrations/fix_profiles_rls_recursion.sql`.

OAuth and the data API will fail closed until the `google_refresh_token` column exists.

## Stack

- **Frontend:** React 19 + Vite 7, TypeScript, Tailwind CSS 4, Wouter, Vaul, Recharts, TanStack Query, React Hook Form, Zod
- **Backend:** Express 5 (Mayar webhooks + cron jobs + notes/transactions/todos/links data API + Google OAuth flow)
- **Auth:** Supabase Auth
- **App data (notes, transactions, todos, links):** Each user connects their Google Drive via OAuth. The backend auto-creates a Google Spreadsheet in the user's own Drive (using `drive.file` scope — least privilege). The spreadsheet ID is stored in `profiles.spreadsheet_id`; the OAuth refresh token in `profiles.google_refresh_token`. No service account needed — each API call uses the user's own OAuth token.
- **Subscription/profile data:** Supabase Postgres (`profiles` table).
- **API client:** Orval-generated from `lib/api-spec/openapi.yaml` into `lib/api-client-react` and `lib/api-zod`. The generated client is wired for auth in `main.tsx`; the data hooks currently use a custom client in `src/lib/apiClient.ts`. Regenerate with `pnpm --filter @workspace/api-spec run codegen`.
- **Package manager:** pnpm 10.26.1 (monorepo)
- **Node.js:** 22

## Frontend patterns

- **CachedSwitch** (`artifacts/teman-nyatet/src/App.tsx`) — every previously-visited page stays mounted in the DOM, toggled via `hidden`. Returning to a previous tab paints instantly from React Query's in-memory cache while the focus-event refetch keeps data fresh in the background. Combined with the `QueryClient` defaults tuned for `staleTime: 30 s` / `gcTime: 30 min`, navigation feels instant without blocking the active paint.
- **Shared overlay bus** — `BottomSheetNav` (snap changes) and `SettingsSheet` (`[open]` changes) both dispatch `window` event `teman-nyatet:any-overlay` with `{ detail: { open: boolean } }`. `PwaInstallPrompt` listens on the same key and unmounts while any overlay is on screen. Any future Drawer/Dialog can opt in with one short `useEffect`.
- **Theme tokens** in `artifacts/teman-nyatet/src/index.css`:
  - `--note-card-1..4` — four sticky-note tints with light pastels in `:root` and flat dark tints under `.dark`. Adding a new tint means one CSS variable, no JS change.
  - `--bottom-nav-collapsed-h: 96px` — `BottomSheetNav`'s `HANDLE_H(28) + NAV_H(68)` collapsed height. Any fixed chrome (e.g. the PWA install banner) that lives below the nav must clear this with a `calc()`, or it overlaps the pill.

## Project structure

- `artifacts/teman-nyatet/` — React+Vite frontend SPA. `src/lib/apiClient.ts` calls the api-server (Bearer = Supabase access token) for notes/transactions/todos/links; `src/lib/supabase.ts` is used for auth and `profiles` updates. `src/pages/ConnectSheetPage.tsx` is the mandatory gate (`/connect-sheet`) for first-time Google OAuth.
- `artifacts/api-server/` — Express API. Key files:
  - `src/lib/google-oauth.ts` — OAuth2 client, redirect URI logic, state signing (HMAC, fails closed without secret)
  - `src/lib/user-sheet.ts` — cached lookup of `profiles.spreadsheet_id` + `google_refresh_token`; typed Google error classification
  - `src/lib/sheet-store.ts` — Generic CRUD with `user_id` row-level isolation; `ensureSheetsInitialized` creates tabs/headers; formula-injection sanitization; per-spreadsheet+tab in-process lock
  - `src/lib/google-sheets.ts` — retry helper, typed access errors
  - `src/middleware/requireAuth.ts` — `requireUser` (token only), `requireAuth` (token + resolves `req.spreadsheetId`), `userRateLimit` (per-user rate limiting)
  - `src/routes/auth-google.ts` — OAuth initiation/callback/disconnect/status
  - `src/routes/spreadsheet.ts` — `GET /spreadsheet/status`, `POST /spreadsheet/validate`, `POST /spreadsheet/repair`
  - `src/routes/{notes,todos,links,transactions}.ts` — Data routes with input validation
  - `src/routes/profile.ts` — `POST /profile/avatar` to Supabase Storage
  - `src/routes/subscription.ts` — `GET /subscription/status`
  - `src/routes/webhook.ts` — Mayar webhook handler
  - `src/routes/cron.ts` — `/api/cron/archive-expired`
  - `src/app.ts` — `helmet()`, CORS, global + per-user rate limiting, JSON body limits
- `lib/api-spec/` — OpenAPI spec + generated API client (regenerate after any spec change)
- `lib/db/` — Drizzle scaffolding (currently unused; migrations are run manually via Supabase SQL Editor)
- `supabase/migrations/` — DB schema for `profiles`

## Replit setup notes

- pnpm pinned to `10.26.1` (matching installed version) with `manage-package-manager-versions=false` in `.npmrc`
- Node.js 22 required — Supabase's realtime client needs native WebSocket (Node 22+)
- Vite config already has `host: 0.0.0.0` and `allowedHosts: true` for Replit proxy compatibility
- Ports are **not** shared via `[userenv.shared]` — each workflow pins its own port in the command. This eliminates port conflicts between the two services.
- `GOOGLE_REDIRECT_URI` remains in `[userenv.shared]` in `.replit` — it is pre-populated with the current workspace's dev domain callback URL.
- **Production lives on Vercel**: dua project (`teman-nyatet` frontend + `teman-nyatet-api-server` API) dari satu repo ini, Root Directory berbeda. Replit env berfungsi sebagai development/staging. Lihat [`docs/GOOGLE-CLOUD-OAUTH.md`](./GOOGLE-CLOUD-OAUTH.md) dan bagian "Deploy ke Vercel" di [`README.md`](../README.md) untuk produksi
- **Production API configuration**: set `VITE_API_SERVER_URL=https://teman-nyatet-api-server.vercel.app` in the frontend Vercel project, and set `OPENAI_API_KEY` separately in the API Vercel project. Replit Secrets are not automatically copied to Vercel.
- `vercel.json` di tiap artifact hanya di-baca Vercel, tidak memengaruhi workflow Replit

## Performance notes

- The frontend production build keeps route-only navigation, charts, drag-and-drop, date formatting, motion, and toaster code out of the smallest startup entry where possible.
- Service-worker registration is scheduled after the first render during browser idle time; this preserves PWA updates without delaying the initial UI.
- API development workflows intentionally retain Pino pretty logs and source maps for debugging. Production builds (`NODE_ENV=production`) omit those development-only artifacts.
- Use the existing typecheck/build commands plus a production browser performance run to measure FCP, LCP, TTI, and scroll smoothness after deployment.

## Vercel build — TypeScript gotcha

The API server's `tsconfig.json` explicitly adds `"lib": ["es2022", "dom"]` (inheriting `es2022` from the base config). The `"dom"` lib is required for Vercel's `@vercel/node` build environment, which resolves `Response` from the global scope differently than local `@types/node` v25. Without it, `fetch()` response properties (`.ok`, `.status`, `.json()`) trigger `TS2339` errors on Vercel even though they pass locally. See `TROUBLESHOOTING.md` for details.

## User preferences

_Populate as you build._
