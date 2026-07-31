# TemanNyatet — Replit Dev Environment

A note-taking SaaS PWA for Indonesian users (Notes, Finance, To-Do, Link Saver).
Production is deployed on Vercel; this Replit environment is for development and testing only.

Full run instructions, secrets list, and architecture notes are in [`docs/replit.md`](docs/replit.md).

## Quick start

Two workflows are configured and will auto-start when you open the project:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/teman-nyatet: web` | `PORT=5000 pnpm --filter @workspace/teman-nyatet run dev` | 5000 |
| `artifacts/api-server: API Server` | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 |

The Vite dev server proxies `/api/*` → `localhost:8080`, so both services share one origin.

## Required secrets

All secrets are configured in the Replit Secrets panel. See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for the full list.

## User preferences

_Populate as you build._
