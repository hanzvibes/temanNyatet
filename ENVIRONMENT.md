# ENVIRONMENT.md — TemanNyatet Environment Variables

> Complete reference for all environment variables. See `AUTH.md` for what each secret is used for. See `DEPLOYMENT.md` for Vercel-specific configuration.

---

## Frontend — `artifacts/teman-nyatet/`

Create `.env.local` in `artifacts/teman-nyatet/` for local development. On Vercel, set these in the frontend project's Environment Variables.

### Required

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL. Format: `https://<project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key. Safe to expose in browser. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `VITE_SITE_URL` | Current browser origin | Canonical domain sent as `emailRedirectTo` in Supabase sign-up emails. Leave unset in Replit/Vercel preview — the app uses `window.location.origin`. Set to `https://temannyatet.id` if using a custom domain. |
| `VITE_API_SERVER_URL` | _(none — uses relative `/api/*`)_ | API server base URL when frontend and API are on different origins. Leave unset in Replit dev (Vite proxies `/api` → `localhost:8080`). Set for Vercel production only if CORS is an issue. |
| `VITE_MAYAR_PAYMENT_URL` | `#` (no-op link) | Mayar payment page URL shown on `/payment`. Example: `https://mayar.id/your-payment-page` |
| `PORT` | `5173` | Vite dev server port. Replit sets this to `5000` automatically. |
| `BASE_PATH` | `/` | Vite `base` option. Leave unset unless deploying to a subpath. |

---

## API Server — `artifacts/api-server/`

Create `.env.local` in `artifacts/api-server/` for local development. On Vercel, set these in the API server project's Environment Variables.

### Required (server will refuse to start if missing)

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL. Same value as `VITE_SUPABASE_URL`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key. **Never expose to browser.** Used to verify JWTs and read/write `profiles`. |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console. Format: `<id>.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret. Format: `GOCSPX-<secret>` |
| `GOOGLE_OAUTH_STATE_SECRET` | Random hex string for HMAC-signing OAuth state params (CSRF protection). Generate: `openssl rand -hex 32`. Must be the same value across all environments sharing one OAuth credential. |
| `CRON_SECRET` | Bearer token securing `POST /api/cron/archive-expired`. Generate: `openssl rand -hex 32`. |

### Optional

| Variable | Default | Description |
|---|---|---|
| `MAYAR_WEBHOOK_SECRET` | _(none)_ | Mayar webhook signing secret. If unset, `POST /api/mayar-webhook` returns `503` (endpoint disabled). Get from Mayar dashboard. |
| `GOOGLE_REDIRECT_URI` | `https://<REPLIT_DEV_DOMAIN>/api/auth/google/callback` or `http://localhost:5000/api/auth/google/callback` | OAuth callback URL. **Must be set explicitly on Vercel production** — Vercel has no `REPLIT_DEV_DOMAIN`. Must match byte-for-byte the URI registered in Google Cloud Console. |
| `FRONTEND_URL` | `https://<REPLIT_DEV_DOMAIN>` or `http://localhost:5000` | URL the API server redirects to after successful OAuth callback. Set to production frontend URL on Vercel. |
| `ALLOWED_ORIGINS` | _(allow all origins)_ | Comma-separated CORS allowlist. Example: `https://teman-nyatet.vercel.app`. Leave unset in dev. Set for production to restrict cross-origin requests. |
| `PORT` | `8080` | API server port. Do not set on Vercel (Vercel assigns its own port). |
| `LOG_LEVEL` | `info` | Pino log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`. |
| `NODE_ENV` | _(unset)_ | Set to `production` on Vercel to disable dev-only behaviors. |

---

## Replit secrets

On Replit, secrets are set in the Secrets panel (not `.env.local` files). The following are used in this project:

| Secret | Maps to |
|---|---|
| `SESSION_SECRET` | Used by Replit platform (not directly by app code) |
| `VITE_SUPABASE_URL` | Frontend Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend Supabase anon key |
| `SUPABASE_URL` | API server Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | API server Supabase service role |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_OAUTH_STATE_SECRET` | HMAC state secret |
| `CRON_SECRET` | Cron endpoint bearer token |
| `MAYAR_WEBHOOK_SECRET` | Mayar webhook secret (optional) |
| `VITE_MAYAR_PAYMENT_URL` | Mayar payment page URL (optional) |

---

## Vercel environment variables — quick reference

### Frontend project (`teman-nyatet`)

```bash
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_MAYAR_PAYMENT_URL=https://mayar.id/your-payment-page
# Only if frontend and API are on different origins AND Vite proxy isn't available:
# VITE_API_SERVER_URL=https://teman-nyatet-api-server.vercel.app
```

### API server project (`teman-nyatet-api-server`)

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-<secret>
GOOGLE_OAUTH_STATE_SECRET=<openssl rand -hex 32>
MAYAR_WEBHOOK_SECRET=<from-mayar-dashboard>
CRON_SECRET=<openssl rand -hex 32>
GOOGLE_REDIRECT_URI=https://teman-nyatet-api-server.vercel.app/api/auth/google/callback
FRONTEND_URL=https://teman-nyatet.vercel.app
ALLOWED_ORIGINS=https://teman-nyatet.vercel.app
NODE_ENV=production
```

---

## Variable derivation logic

The API server derives some values from the environment at runtime:

```
GOOGLE_REDIRECT_URI priority:
  1. env GOOGLE_REDIRECT_URI (explicit — always use for production)
  2. https://<REPLIT_DEV_DOMAIN>/api/auth/google/callback (Replit dev)
  3. http://localhost:5000/api/auth/google/callback (local fallback)

FRONTEND_URL priority:
  1. env FRONTEND_URL
  2. https://<REPLIT_DEV_DOMAIN>
  3. http://localhost:5000
```

On Vercel, `REPLIT_DEV_DOMAIN` is not set, so without explicit env vars the fallback is `localhost:5000` — which is wrong for production. **Always set `GOOGLE_REDIRECT_URI` and `FRONTEND_URL` on Vercel.**
