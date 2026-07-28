# TemanNyatet — Replit Dev Environment

A note-taking SaaS PWA for Indonesian users (Notes, Finance, To-Do, Link Saver). Production is deployed on Vercel; this Replit environment is for development.

Full documentation is in [`docs/replit.md`](docs/replit.md).

## Quick start

Both workflows should be running:
- **`artifacts/teman-nyatet: web`** — Vite dev server on port 5000 (frontend)
- **`artifacts/api-server: API Server`** — Express API on port 8080

The Vite proxy forwards `/api` requests to the API server, so you can use relative URLs in the frontend.

## Required secrets

All secrets are configured. See [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for the full list.

## User preferences

_Populate as you build._
