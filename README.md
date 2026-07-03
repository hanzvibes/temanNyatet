# TemanNyatet

A note-taking SaaS web app + PWA for Indonesian users. Four core modules: Catatan (Notes), Catatan Keuangan (Finance), To Do List, and Link Saver. Mobile-first with bottom sheet patterns ("sat-set" UX).

## Run & Operate

- `pnpm --filter @workspace/teman-nyatet run dev` — frontend (defaults to port 5173, override with `PORT`)
- `pnpm --filter @workspace/api-server run dev` — API server (port 8080)
- `pnpm run typecheck` — full typecheck
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks from OpenAPI spec

## Stack

- Frontend: React + Vite, TypeScript, Tailwind CSS
- Backend: Express 5 (API server)
- Auth + DB: Supabase (Auth + Postgres with RLS)
- UI: vaul (bottom sheets), Recharts (finance charts), date-fns, lucide-react
- State: React Context (auth) + useState/useEffect (feature data via Supabase directly)
- Routing: wouter
- PWA: service worker (public/sw.js) + manifest.json

## Where things live

- `artifacts/teman-nyatet/` — React+Vite frontend SPA
- `artifacts/api-server/` — Express API (Mayar webhook, subscription status, cron)
- `artifacts/teman-nyatet/src/contexts/AuthContext.tsx` — Supabase auth state
- `artifacts/teman-nyatet/src/hooks/` — useNotes, useTransactions, useTodos, useLinks
- `artifacts/teman-nyatet/src/pages/` — all page components
- `artifacts/teman-nyatet/src/lib/supabase.ts` — Supabase browser client
- `artifacts/teman-nyatet/src/lib/database.types.ts` — TypeScript types for all tables
- `artifacts/api-server/src/lib/supabase-admin.ts` — Supabase admin client (service role)
- `artifacts/api-server/src/routes/webhook.ts` — Mayar payment webhook handler
- `artifacts/api-server/src/routes/cron.ts` — daily subscription archive cron
- `lib/api-spec/openapi.yaml` — API contract (subscription status + webhook)
- `supabase/migrations/001_initial_schema.sql` — full DB schema + RLS policies
- `supabase/migrations/README.md` — Supabase setup instructions

## Architecture decisions

- **Direct Supabase from frontend**: All CRUD (notes, transactions, todos, links) goes through the Supabase JS client directly from the browser. RLS policies enforce that users can only access their own data. No API proxy for data operations.
- **API server handles server-only operations**: Mayar webhook (needs service role key to update profiles), subscription status endpoint, and daily cron to archive expired accounts.
- **React+Vite instead of Next.js**: The Replit workspace scaffolds React+Vite. All requirements (auth guard, server actions, middleware) are implemented via Supabase Auth + Express API routes instead of Next.js-specific primitives.
- **Vaul for bottom sheets**: All feature input forms use the `vaul` library for mobile-feel drawer animations.
- **Manual PWA**: Service worker in `public/sw.js` + `manifest.json` without next-pwa (incompatible with Vite 7+).

## Product

- **Catatan**: Create/edit/delete notes with tags and colored cards
- **Keuangan**: Track income/expense transactions with monthly summary + Recharts bar chart
- **Todo**: Checkbox to-do list with due dates
- **Link Saver**: Save bookmarks with title, URL, note + copy to clipboard
- **Subscription**: Rp249.000/tahun or Rp100.000/bulan via Mayar payment
- **Auth guard**: pending → /payment, archived → /archived, active → app

## User preferences

_Populate as you build._

## Gotchas

- Supabase env vars use `VITE_` prefix for frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- API server uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (no VITE_ prefix, server-only)
- Mayar webhook URL must be set in Mayar dashboard: `https://your-domain.com/api/mayar-webhook`
- Run `supabase/migrations/001_initial_schema.sql` in Supabase SQL Editor before launch
- All Supabase tables have RLS enabled — test with multiple users before production
- The auto-create profile trigger runs on auth.users INSERT — ensures profiles row is always created on signup

## Environment Variables Required

### Frontend (.env.local in artifacts/teman-nyatet/)
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_MAYAR_PAYMENT_URL=https://mayar.id/your-payment-page
```

### API Server (.env.local in artifacts/api-server/)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
MAYAR_WEBHOOK_SECRET=your-webhook-secret
CRON_SECRET=your-cron-secret
```

## Pointers

- See `supabase/migrations/README.md` for full Supabase setup guide

## Deploy ke Vercel

Repo ini punya dua deployable yang beda kebutuhan build-nya, jadi deploy sebagai **dua Vercel Project terpisah** (satu repo, dua project, masing-masing dengan Root Directory sendiri):

### 1. Frontend — `artifacts/teman-nyatet`

- Root Directory: `artifacts/teman-nyatet`
- Vercel otomatis pakai `vercel.json` di folder itu (framework Vite, build `pnpm run build`, output `dist/public`, plus rewrite SPA fallback ke `index.html`)
- Env vars yang wajib diisi di Project Settings → Environment Variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_MAYAR_PAYMENT_URL`

### 2. API server — `artifacts/api-server`

- Root Directory: `artifacts/api-server`
- Deploy sebagai Express app zero-config (Vercel mendeteksi `src/index.ts` yang `app.listen()`, langsung dibungkus jadi Vercel Function — tidak perlu ubah kode)
- Env vars yang wajib diisi:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `MAYAR_WEBHOOK_SECRET`
  - `CRON_SECRET`
- Setelah live, update webhook URL di dashboard Mayar ke `https://<domain-api-server>/api/mayar-webhook`
- Endpoint `/api/cron/archive-expired` masih pakai pola POST + Bearer token (`CRON_SECRET`), jadi tetap dipanggil dari scheduler eksternal (GitHub Actions cron, cron-job.org, dll) — bukan Vercel Cron Jobs bawaan (yang cuma bisa GET). Kalau mau pindah ke Vercel Cron, endpoint ini perlu ditambah handler GET.

### Catatan pnpm

Root `package.json` sudah di-pin `"packageManager": "pnpm@10.34.3"` supaya Vercel pakai versi pnpm yang paham `catalog:` protocol dan `minimumReleaseAge` di `pnpm-workspace.yaml`. Jangan hapus field ini, dan jangan upgrade ke pnpm 11 tanpa migrasi `onlyBuiltDependencies` ke `allowBuilds` dulu (breaking change di pnpm 11).

