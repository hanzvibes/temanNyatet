---
name: Vercel webhook deployment state
description: Production Vercel can serve an older API deployment even when the repository contains the webhook route.
---

The SumoPod webhook URL must target the production API route:
`https://teman-nyatet-api-server.vercel.app/api/sumopod-webhook`. A successful
`GET /api/healthz` does not prove that the latest route code is live; the API
deployment must be redeployed from `main` with Root Directory
`artifacts/api-server` before relying on SumoPod `Save & Test`.

**Why:** The production API previously returned `404 Cannot POST
/api/sumopod-webhook` while the repository source and Replit workflow both had
the route registered. This indicates a stale or incorrectly rooted Vercel
deployment, not an incorrect SumoPod URL.

**How to apply:** When configuring external webhooks, verify both the public
health endpoint and the exact POST route after every production API deploy.