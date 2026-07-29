# TemanNyatet

A note-taking SaaS web app + PWA for Indonesian users. Four core modules: Catatan (Notes), Catatan Keuangan (Finance), To Do List, and Link Saver. Mobile-first with bottom sheet patterns ("sat-set" UX).

## Run & Operate

- `pnpm install` — install dependencies
- `PORT=5000 pnpm --filter @workspace/teman-nyatet run dev` — frontend (Vite dev server, port 5000)
- `PORT=8080 pnpm --filter @workspace/api-server run dev` — API server (builds then starts, port 8080)
- `pnpm run typecheck` — full typecheck across workspace
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API client from OpenAPI spec

> In Replit dev, both ports are pinned explicitly in the workflow commands. `PORT` is no longer set as a shared environment variable — each service manages its own port.

## Stack

- Frontend: React 19 + Vite 7, TypeScript, Tailwind CSS 4, Wouter, Vaul, Recharts, TanStack Query, React Hook Form, Zod
- Backend: Express 5 (API server)
- Auth: Supabase Auth (email/password with confirmation)
- App data: per-user Google Spreadsheet via OAuth2 (authored by the API server in the user's own Google Drive)
- Subscription/profile data: Supabase Postgres (`profiles` table)
- AI credits: Supabase Postgres (`user_credits` + immutable `credit_ledger`)
- UI: shadcn/ui components, vaul (bottom sheets), Recharts (finance charts), date-fns, lucide-react
- Routing: wouter
- PWA: VitePWA plugin + `manifest.json` in `public/`
- API client: Orval-generated from `lib/api-spec/openapi.yaml` into `lib/api-client-react` (used for token wiring in `main.tsx`); data hooks currently use a custom client in `src/lib/apiClient.ts`

## Where things live

- `artifacts/teman-nyatet/` — React+Vite frontend SPA
- `artifacts/api-server/` — Express API (Mayar webhook, subscription status, cron, Google OAuth, data routes for notes/transactions/todos/links)
- `lib/api-spec/` — OpenAPI spec + Orval config + generated API client packages
- `lib/db/` — Drizzle scaffolding (currently unused; migrations are run manually via Supabase SQL Editor)
- `supabase/migrations/` — DB schema for `profiles` and RLS policies
- `artifacts/teman-nyatet/src/contexts/AuthContext.tsx` — Supabase auth state + profile loading
- `artifacts/teman-nyatet/src/hooks/` — `useNotes`, `useTransactions`, `useTodos`, `useLinks` (call the API server, not Supabase directly)
- `artifacts/teman-nyatet/src/pages/` — all page components
- `artifacts/teman-nyatet/src/lib/apiClient.ts` — custom fetch wrapper that sends Supabase access token as Bearer and retries on 401
- `artifacts/teman-nyatet/src/lib/database.types.ts` — TypeScript schema types (notes/transactions/todos/links are legacy Supabase table shapes; data lives in Google Sheets)
- `artifacts/api-server/src/lib/google-oauth.ts` — OAuth2 client, redirect URI logic, HMAC-signed state
- `artifacts/api-server/src/lib/user-sheet.ts` — resolves `spreadsheet_id` + `google_refresh_token` into a per-user Sheets client
- `artifacts/api-server/src/lib/sheet-store.ts` — generic CRUD against Google Sheets tabs
- `artifacts/api-server/src/middleware/requireAuth.ts` — Supabase token verification, per-user rate limiting, `req.sheetsClient` attachment
- `artifacts/api-server/src/routes/webhook.ts` — Mayar payment webhook handler
- `artifacts/api-server/src/routes/cron.ts` — `/api/cron/archive-expired` (POST + `CRON_SECRET` Bearer)
- `artifacts/api-server/src/routes/auth-google.ts` — `/auth/google/initiate`, `/callback`, `/status`, `/disconnect`
- `artifacts/api-server/src/routes/{notes,transactions,todos,links}.ts` — data routes
- `artifacts/api-server/src/routes/spreadsheet.ts` — `GET /spreadsheet/status`, `POST /spreadsheet/validate`, `POST /spreadsheet/repair`
- `artifacts/api-server/src/routes/profile.ts` — `POST /profile/avatar` (uploads to Supabase Storage `avatars` bucket)
- `artifacts/api-server/src/routes/subscription.ts` — `GET /subscription/status` with `credit_balance`
- `artifacts/api-server/src/routes/credits.ts` — `GET /credits`
- `artifacts/api-server/src/routes/health.ts` — `GET /api/healthz` (router mounted under `/api`)

## Architecture decisions

- **Supabase for auth and profile only**: User authentication and the `profiles` table live in Supabase. RLS policies enforce row-level access to `profiles`.
- **Google Sheets for app data**: Notes, transactions, todos, and links are stored in a private Google Spreadsheet created automatically in the user's own Drive via OAuth. The API server translates REST requests into Google Sheets API calls.
- **API server required for data**: The frontend calls `https://.../api/...` (proxied to the API server in local dev). Each request carries a Supabase access token; the API server verifies it with Supabase and resolves the user's spreadsheet connection.
- **React+Vite instead of Next.js**: The Replit workspace scaffolds React+Vite. Server-side requirements (webhooks, cron, OAuth callback) are implemented as Express routes.
- **Vaul for bottom sheets**: Feature input forms use the `vaul` library for mobile-feel drawer animations.
- **PWA via VitePWA**: `vite-plugin-pwa` generates the service worker and precaches assets. `manifest.json` is maintained manually in `public/`.
- **CachedSwitch for instant navigation** (`src/App.tsx`): every visited page stays mounted in the DOM, toggled via the `hidden` attribute, so React Query's hooks + cache survive back-tab visits. Combined with the `QueryClient` defaults (`staleTime: 30 s`, `gcTime: 30 min`, `refetchOnWindowFocus: 'always'`), returning to a previous page paints from cache instantly and silently revalidates in the background.
- **Overlay bus via window event** (`BottomSheetNav`, `SettingsSheet`, `PwaInstallPrompt`): sheets dispatch `teman-nyatet:any-overlay` on open/closed transitions; the PWA prompt hides for the lifetime of any overlay. New modals can opt in with a single `useEffect`.

## Product

- **Catatan**: Create/edit/delete/reorder notes with tags and colored cards
- **AI summaries**: Indonesian note summaries; 10 initial credits per user, one credit per successful summary
- **Keuangan**: Track income/expense transactions with monthly summary + Recharts bar chart
- **Todo**: Checkbox to-do list with due dates and times
- **Link Saver**: Save bookmarks with title, URL, note + copy to clipboard + search
- **Subscription**: Rp249.000/tahun or Rp100.000/bulan via Mayar payment
- **Auth guard**: pending → `/payment`, archived → `/archived`, active → app; no Google connection → `/connect-sheet`

## User preferences

_Populate as you build._

## Gotchas

- Supabase env vars use `VITE_` prefix for frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- API server uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (no `VITE_` prefix, server-only)
- Google OAuth env vars are required for the API server: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`
- Mayar webhook URL must be set in Mayar dashboard: `https://<your-api-domain>/api/mayar-webhook`
- Run all `supabase/migrations/*.sql` files in order in the Supabase SQL Editor before launch (see [`docs/SUPABASE-SETUP.md`](./docs/SUPABASE-SETUP.md))
- `profiles` has RLS enabled; the `fix_profiles_rls_recursion.sql` script must also be applied if you hit an "infinite recursion detected in policy" error
- The auto-create profile trigger runs on `auth.users` INSERT; `AuthContext` also has a client-side fallback upsert
- `notes`, `transactions`, `todos`, and `links` tables are created by `001_initial_schema.sql` but dropped by `005_phase1_schema.sql`; app data lives in Google Sheets, not these tables

## Environment Variables Required

### Frontend (`.env.local` in `artifacts/teman-nyatet/`)

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: canonical domain for Supabase email confirmation links.
# Leave unset for Replit and Vercel previews (the app uses the current origin).
VITE_SITE_URL=https://temannyatet.id

# Optional: API server base URL when frontend and API are on different origins.
# Leave unset in Replit dev; the Vite dev server proxies /api to localhost:8080.
# In production, the app defaults to the API Vercel project below if this is unset.
VITE_API_SERVER_URL=https://teman-nyatet-api-server.vercel.app

VITE_MAYAR_PAYMENT_URL=https://mayar.id/your-payment-page
```

### API Server (`.env.local` in `artifacts/api-server/`)

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_OAUTH_STATE_SECRET=random-hex-string

MAYAR_WEBHOOK_SECRET=your-webhook-secret
CRON_SECRET=your-random-cron-secret

# Optional: override the OAuth redirect URI (defaults to REPLIT_DEV_DOMAIN or localhost:5000)
# GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback

# Optional: override frontend URL for OAuth callback redirects (defaults to REPLIT_DEV_DOMAIN or localhost:5000)
# FRONTEND_URL=https://your-frontend-domain.com

# Optional: comma-separated list of allowed CORS origins (defaults to allow all origins)
# ALLOWED_ORIGINS=https://your-frontend-domain.com

PORT=8080
LOG_LEVEL=info
```

## Documentation map

For AI agents and new contributors, read in this order:

1. [`AI_CONTEXT.md`](./docs/AI_CONTEXT.md) — quick project overview and conventions.
2. [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system architecture and data flow.
3. [`AUTH.md`](./docs/AUTH.md) — authentication flows and required configs.
4. [`DATABASE.md`](./docs/DATABASE.md) — Supabase schema and Google Sheets tab schemas.
5. [`API.md`](./docs/API.md) — complete API route reference.
6. [`ENVIRONMENT.md`](./docs/ENVIRONMENT.md) — all environment variables.
7. [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — Vercel deployment runbook.
8. [`replit.md`](./docs/replit.md) — Replit-specific run instructions and secrets.

| File | What's in it |
|---|---|
| [`AI_CONTEXT.md`](./docs/AI_CONTEXT.md) | AI-agent quick reference — read this first |
| [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Full system architecture, routing, data layer |
| [`API.md`](./docs/API.md) | Complete API route reference |
| [`AUTH.md`](./docs/AUTH.md) | Authentication + Google OAuth flows |
| [`DATABASE.md`](./docs/DATABASE.md) | Supabase schema + Google Sheets tab schemas |
| [`ENVIRONMENT.md`](./docs/ENVIRONMENT.md) | All environment variables (required + optional) |
| [`DEPLOYMENT.md`](./docs/DEPLOYMENT.md) | Vercel deployment runbook |
| [`PRD.md`](./docs/PRD.md) | Product requirements (confirmed features only) |
| [`DECISIONS.md`](./docs/DECISIONS.md) | Architecture Decision Records (why things are the way they are) |
| [`SECURITY.md`](./docs/SECURITY.md) | Security controls and known limitations |
| [`TROUBLESHOOTING.md`](./docs/TROUBLESHOOTING.md) | Common problems and solutions |
| [`ROADMAP.md`](./docs/ROADMAP.md) | Completed / planned / future |
| [`TASKS.md`](./docs/TASKS.md) | Prioritized actionable tasks |
| [`UI_UX_GUIDELINES.md`](./docs/UI_UX_GUIDELINES.md) | Frontend design system and conventions |
| [`TESTING.md`](./docs/TESTING.md) | Manual checklist + automation roadmap |
| [`docs/SUPABASE-SETUP.md`](./docs/SUPABASE-SETUP.md) | Supabase setup instructions |
| [`docs/GOOGLE-CLOUD-OAUTH.md`](./docs/GOOGLE-CLOUD-OAUTH.md) | Google Cloud Console OAuth setup walkthrough |
| [`replit.md`](./docs/replit.md) | Replit-specific run instructions and secrets |

## Deploy ke Vercel

Repo ini punya dua deployable yang beda kebutuhan build-nya, jadi deploy sebagai **dua Vercel Project terpisah** (satu repo, dua project, masing-masing dengan Root Directory sendiri):

### 1. Frontend — `artifacts/teman-nyatet`

- Root Directory: `artifacts/teman-nyatet`
- Vercel otomatis pakai `vercel.json` di folder itu (framework Vite, build `pnpm run build`, output `dist/public`, plus rewrite SPA fallback ke `index.html`)
- Env vars yang wajib diisi di Project Settings → Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_MAYAR_PAYMENT_URL`
  - `VITE_API_SERVER_URL=https://teman-nyatet-api-server.vercel.app` (disarankan; production fallback juga tersedia)

### 2. API server — `artifacts/api-server`

- Root Directory: `artifacts/api-server`
- Deploy sebagai Express app zero-config (Vercel mendeteksi `src/index.ts` yang `app.listen()`, langsung dibungkus jadi Vercel Function — tidak perlu ubah kode)
- Env vars yang wajib diisi:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_OAUTH_STATE_SECRET`
  - `MAYAR_WEBHOOK_SECRET`
   - `CRON_SECRET` (required to run the external archive-expiry job)
  - `FRONTEND_URL` (production frontend URL — used for OAuth callback redirects)
  - `ALLOWED_ORIGINS` (production frontend URL — gates CORS)
  - `GOOGLE_REDIRECT_URI` (production callback URI — must match Google Cloud Console byte-for-byte)
  - `OPENAI_API_KEY` (required to enable note summarization)
  - `OPENAI_BASE_URL` (optional; defaults to `https://ai.sumopod.com`)
  - `OPENAI_MODEL` (optional; defaults to `gpt-4o-mini`)
   - `INITIAL_AI_CREDITS` (optional; defaults to `10`, must match Supabase `app.initial_ai_credits`)
- Setelah live, update webhook URL di dashboard Mayar ke `https://<domain-api-server>/api/mayar-webhook`
- Setelah live, verify the API with `https://teman-nyatet-api-server.vercel.app/api/healthz`. The API project root returns service metadata; health is mounted under `/api`.
- Endpoint `/api/cron/archive-expired` masih pakai pola POST + Bearer token (`CRON_SECRET`), jadi tetap dipanggil dari scheduler eksternal (GitHub Actions cron, cron-job.org, dll) — bukan Vercel Cron Jobs bawaan (yang cuma bisa GET). Kalau mau pindah ke Vercel Cron, endpoint ini perlu ditambah handler GET.

### Production domains (July 2026)

Saat ini live di Vercel sebagai dua project dengan domain tetap (tidak berubah sampai deploy ulang):

| Service | Domain | Catatan |
|---|---|---|
| Frontend | `https://teman-nyatet.vercel.app` | SPA dengan rewrite `(.*)→/index.html` |
| API server | `https://teman-nyatet-api-server.vercel.app` | `@vercel/node` serverless function |

Supabase Redirect URLs (Auth → Settings) harus menyertakan keduanya plus `https://*.vercel.app/login` dan `https://*.vercel.app/**` untuk preview branches.

The frontend API client uses `/api` through the Vite proxy in Replit development. In a production build it uses `VITE_API_SERVER_URL`, or falls back to `https://teman-nyatet-api-server.vercel.app` when that variable is absent. The API server must allow the frontend origin through `ALLOWED_ORIGINS`.

Google Cloud Console Authorized redirect URI untuk OAuth credential **wajib** persis byte-for-byte sama dengan `GOOGLE_REDIRECT_URI` di Vercel. Lihat [`docs/GOOGLE-CLOUD-OAUTH.md`](./docs/GOOGLE-CLOUD-OAUTH.md) untuk checklist lengkap (setup, verifikasi, rotasi secret).

### Catatan pnpm

Root `package.json` sudah di-pin `"packageManager": "pnpm@10.26.1"` supaya Vercel pakai versi pnpm yang konsisten. Jangan hapus field ini, dan jangan upgrade ke pnpm 11 tanpa migrasi `onlyBuiltDependencies` ke `allowBuilds` dulu (breaking change di pnpm 11).
