# TemanNyatet

A mobile-first productivity PWA for notes, finance tracking, todos, and link saving. Built in Indonesian.

## Stack

- **Frontend** (`artifacts/teman-nyatet`): React + Vite + Tailwind CSS + shadcn/ui, served on port 5000
- **Backend** (`artifacts/api-server`): Express 5 + Drizzle ORM, served on port 8080
- **Auth/DB**: Supabase (Postgres + Row Level Security + Google OAuth)
- **Payments**: SumoPod
- **Package manager**: pnpm (workspace monorepo)

## Running the project

Two workflows are configured and start automatically:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/teman-nyatet: web` | `pnpm --filter @workspace/teman-nyatet run dev` | 5000 |
| `artifacts/api-server: API Server` | `pnpm --filter @workspace/api-server run dev` | 8080 |

## Install dependencies

```bash
pnpm install
```

## Required secrets

All secrets are configured in the Replit environment:

| Secret | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (backend only) |
| `VITE_SUPABASE_URL` | Supabase URL exposed to the frontend |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key exposed to the frontend |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 client secret |
| `GOOGLE_OAUTH_STATE_SECRET` | HMAC signing secret for OAuth state |
| `SESSION_SECRET` | Express session secret |
| `DATABASE_URL` | Postgres connection string (for Drizzle) |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_BASE_URL` | OpenAI base URL |
| `OPENAI_MODEL` | OpenAI model name |
| `CRON_SECRET` | Secret for cron job endpoints |
| `MAYAR_WEBHOOK_SECRET` | SumoPod/Mayar webhook verification secret |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google service account JSON (Sheets integration) |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheets spreadsheet ID |

## Database migrations

Supabase migrations are in `supabase/migrations/`. Run them in order via the Supabase SQL Editor.

## Project structure

```
artifacts/
  api-server/       # Express backend
  teman-nyatet/     # React frontend (PWA)
lib/
  api-client-react/ # React Query hooks generated from API spec
  api-spec/         # OpenAPI / API contract
  api-zod/          # Zod schemas
  db/               # Drizzle schema & migrations
supabase/
  migrations/       # Supabase SQL migrations
scripts/
  post-merge.sh     # Runs after task-agent merges
```

## User preferences

_None recorded yet._
