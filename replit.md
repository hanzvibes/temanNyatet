# TemanNyatet

A note-taking SaaS PWA for Indonesian users. Four modules: Catatan (Notes), Catatan Keuangan (Finance), To Do List, and Link Saver. Mobile-first with bottom sheet patterns.

## How to run

Two services run in parallel:

| Service | Workflow | Port |
|---|---|---|
| Frontend (React + Vite) | `artifacts/teman-nyatet: web` | 5000 |
| API server (Express) | `artifacts/api-server: API Server` | 8080 |

The frontend proxies `/api/*` to the API server at `localhost:8080`, so the preview at port 5000 covers both.

## Stack

- **Frontend**: React 19 + Vite 7, TypeScript, Tailwind CSS 4, Wouter, TanStack Query, shadcn/ui, Vaul (bottom sheets), Recharts
- **Backend**: Express 5 (TypeScript, built with esbuild)
- **Auth**: Supabase Auth (email/password)
- **App data**: Per-user Google Spreadsheet via OAuth2 (notes, transactions, todos, links)
- **Profile/subscription data**: Supabase Postgres (`profiles` table)

## Where things live

- `artifacts/teman-nyatet/` — React + Vite frontend SPA
- `artifacts/api-server/` — Express API server
- `lib/api-spec/` — OpenAPI spec + Orval-generated client
- `supabase/migrations/` — DB schema and RLS policies
- `docs/` — Architecture, API, auth, deployment docs

## Required secrets (already configured)

| Secret | Used by |
|---|---|
| `VITE_SUPABASE_URL` | Frontend |
| `VITE_SUPABASE_ANON_KEY` | Frontend |
| `SUPABASE_URL` | API server |
| `SUPABASE_SERVICE_ROLE_KEY` | API server |
| `GOOGLE_CLIENT_ID` | API server |
| `GOOGLE_CLIENT_SECRET` | API server |
| `GOOGLE_OAUTH_STATE_SECRET` | API server |
| `MAYAR_WEBHOOK_SECRET` | API server |
| `CRON_SECRET` | API server |

`GOOGLE_REDIRECT_URI` is pre-set in `.replit` `[userenv.shared]` to the Replit dev domain callback URL.

## Production

Live on Vercel as two separate projects:
- Frontend: `https://teman-nyatet.vercel.app`
- API: `https://teman-nyatet-api-server.vercel.app`

See `docs/DEPLOYMENT.md` and `docs/GOOGLE-CLOUD-OAUTH.md` for deploy checklist.

## User preferences

(none yet)
