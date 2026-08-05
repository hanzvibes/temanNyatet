# TemanNyatet

A productivity web app ("Catat sat-set, urusan beres") built with React + Vite (frontend) and Express (API server), backed by Supabase for auth and Google Sheets for data storage.

## Project structure

This is a pnpm workspace (monorepo):

```
artifacts/teman-nyatet/   — React/Vite frontend (port 5000)
artifacts/api-server/     — Express API server (port 8080)
lib/                      — Shared libraries (db, api-client, etc.)
pnpm-workspace.yaml       — Workspace + catalog config
```

## Running locally on Replit

Two workflows are configured and start automatically:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/teman-nyatet: web` | `pnpm --filter @workspace/teman-nyatet run dev` | 5000 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

The Vite dev server proxies `/api` requests to `localhost:8080`, so the frontend and API work together seamlessly in dev without setting `VITE_API_SERVER_URL`.

Install all dependencies from the repo root:
```bash
pnpm install
```

## Environment secrets

All secrets are managed via Replit Secrets. Required variables:

**API server** (`artifacts/api-server`):
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth 2.0
- `GOOGLE_OAUTH_STATE_SECRET` — HMAC signing secret for OAuth CSRF protection
- `GOOGLE_SERVICE_ACCOUNT_KEY` / `GOOGLE_SHEETS_SPREADSHEET_ID` — Sheets backup
- `MAYAR_WEBHOOK_SECRET` — Legacy payment webhook
- `CRON_SECRET` — Auth for `/api/cron/archive-expired`
- `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` — AI features
- `DATABASE_URL` — Postgres connection (Supabase)

**Frontend** (`artifacts/teman-nyatet`):
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase client credentials

## Stack

- **Frontend**: React 19, Vite 7, Tailwind CSS 4, Radix UI, TanStack Query, Zustand, Wouter, Framer Motion
- **Backend**: Express 5, Drizzle ORM, Pino logger, esbuild
- **Auth**: Supabase Auth + Google OAuth
- **Data**: Supabase (Postgres) + Google Sheets
- **Payments**: SumoPod (sandbox)

## User preferences

<!-- Add any personal preferences here -->
