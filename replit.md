# TemanNyatet Workspace

A pnpm monorepo containing the TemanNyatet productivity app — notes, todos, finance tracking, and AI transcription — backed by Supabase auth and a Google Sheets data layer.

## Project structure

```
artifacts/
  teman-nyatet/   — React + Vite SPA (frontend, port 5000)
  api-server/     — Express 5 JSON API (backend, port 8080)
lib/
  api-spec/       — OpenAPI contract (openapi.yaml + Orval codegen)
  api-zod/        — Generated Zod schemas shared across workspace
  api-client-react/ — Generated React Query hooks consumed by the frontend
  db/             — Drizzle ORM schema + PostgreSQL migrations
supabase/
  migrations/     — Supabase SQL migration history
scripts/          — One-off migration / setup scripts
```

## Running locally

Both workflows are pre-configured and start automatically:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/teman-nyatet: web` | `pnpm --filter @workspace/teman-nyatet run dev` | 5000 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

The Vite dev server proxies `/api/*` → `http://localhost:8080`, so the frontend and API work together with no CORS config needed in development.

## Required secrets

All secrets are stored as Replit Secrets (never in `.env` files):

**API Server**
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase project credentials
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_OAUTH_STATE_SECRET` — Google OAuth for Sheets backup
- `GOOGLE_SERVICE_ACCOUNT_KEY` — Service account JSON for Google Sheets access
- `GOOGLE_SHEETS_SPREADSHEET_ID` — Target spreadsheet
- `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `OPENAI_MODEL` — AI transcription
- `MAYAR_WEBHOOK_SECRET` / `CRON_SECRET` — Webhook and cron authentication
- `DATABASE_URL` — PostgreSQL connection string

**Frontend**
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` — Supabase public credentials

## Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Radix UI, TanStack Query, Wouter, Supabase JS, Framer Motion, PWA
- **Backend**: Node.js, Express 5, Drizzle ORM, Supabase Admin SDK, Google APIs, Pino logging
- **Package manager**: pnpm 10 (required — yarn/npm blocked by preinstall check)

## User preferences

- Use pnpm for all package management operations
