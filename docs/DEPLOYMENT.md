# DEPLOYMENT.md — TemanNyatet

> Full deployment reference. For Google Cloud Console setup details, see [`docs/GOOGLE-CLOUD-OAUTH.md`](./GOOGLE-CLOUD-OAUTH.md).  
> For environment variables, see [`docs/ENVIRONMENT.md`](./ENVIRONMENT.md).

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| ENVIRONMENT — all env vars & secrets | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| AUTH — OAuth flows & redirect URIs | [`AUTH.md`](./AUTH.md) |
| Google Cloud Console setup walkthrough | [`docs/GOOGLE-CLOUD-OAUTH.md`](./GOOGLE-CLOUD-OAUTH.md) |
| docs/SUPABASE-SETUP.md — DB setup | [`docs/SUPABASE-SETUP.md`](./SUPABASE-SETUP.md) |
| TROUBLESHOOTING — deploy issues | [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md) |

---

## Production environments

| Service | Platform | URL |
|---|---|---|
| Frontend | Vercel | `https://teman-nyatet.vercel.app` |
| API server | Vercel | `https://teman-nyatet-api-server.vercel.app` |
| Auth/profile/credits | Supabase | Managed Postgres |
| App data | SumoPod PostgreSQL + Google Sheets | PostgreSQL for migrated users; Sheets migration source/fallback |

Development runs on Replit. Both services are configured as workflows in the Replit workspace.

---

## Vercel deployment — two-project setup

The repo deploys as **two separate Vercel projects** from the same GitHub repository. Each project has its own Root Directory.

| Project name | Root Directory | Runtime |
|---|---|---|
| `teman-nyatet` | `artifacts/teman-nyatet` | Vite SPA → `dist/public`, SPA rewrite to `index.html` |
| `teman-nyatet-api-server` | `artifacts/api-server` | `@vercel/node` serverless function |

### Deploying the frontend

1. Connect `artifacts/teman-nyatet` as Root Directory in Vercel
2. Vercel auto-detects Vite framework from `vercel.json`
3. Build command: `pnpm run build` (set automatically)
4. Output directory: `dist/public` (set in `vercel.json`)
5. Set environment variables (see `ENVIRONMENT.md` → Vercel frontend section)

### Deploying the API server

1. Connect `artifacts/api-server` as Root Directory in Vercel
2. Vercel detects `src/index.ts` as serverless entry (`vercel.json` specifies `@vercel/node`)
3. `app.listen()` is gated on `process.env.VERCEL !== '1'` — no code changes needed
4. `export default app` in `src/index.ts` is required for `@vercel/node`
5. Set all required environment variables (see `ENVIRONMENT.md` → Vercel API server section)
6. **Important**: The API server's `tsconfig.json` adds `"lib": ["es2022", "dom"]` to its `compilerOptions`. This is required for Vercel's build environment — without `"dom"`, TypeScript errors on `fetch()` response properties (`.ok`, `.status`, `.json()`) will block deployment. The base tsconfig only includes `"es2022"`, which lacks Web API types.
7. Set `OPENAI_API_KEY` in the Vercel API project to enable note summarization. Replit Secrets do not propagate to Vercel. The optional `OPENAI_BASE_URL` defaults to `https://ai.sumopod.com`, and `OPENAI_MODEL` defaults to `gpt-4o-mini`.

### pnpm version

Root `package.json` pins `"packageManager": "pnpm@10.26.1"`. Do not remove this field. Do not upgrade to pnpm 11 without migrating `onlyBuiltDependencies` → `allowBuilds` (breaking change in pnpm 11).

---

## Required post-deploy steps

After first deploy (or after updating OAuth credentials):

### 1. Verify API server is alive

```bash
curl -i https://teman-nyatet-api-server.vercel.app/api/healthz
# Expected: HTTP 200  {"status":"ok"}
```

### 2. Configure Supabase

In your Supabase project → Authentication → Settings:

- **Site URL**: `https://teman-nyatet.vercel.app`
- **Redirect URLs**: add
  - `https://teman-nyatet.vercel.app/login`
  - `https://*.vercel.app/login`
  - `https://*.vercel.app/**`

### 3. Configure Google Cloud Console

See [`docs/GOOGLE-CLOUD-OAUTH.md`](./GOOGLE-CLOUD-OAUTH.md) for the full checklist. Key requirement:

**Authorized redirect URI** must be registered exactly as:
```
https://teman-nyatet-api-server.vercel.app/api/auth/google/callback
```

This must match the `GOOGLE_REDIRECT_URI` Vercel env var byte-for-byte (lowercase, no trailing slash, full path).

### 4. Configure SumoPod Sandbox webhook

In SumoPod Sandbox **Settings → Webhook**, set the webhook URL to:
```
https://teman-nyatet-api-server.vercel.app/api/sumopod-webhook
```

This URL is the API route, not the frontend URL. Verify a valid POST against
the active deployment after each API deploy; a healthy `/api/healthz` response
does not prove that webhook routing is current.

Configure the payment redirects in SumoPod:
```
Success: https://teman-nyatet.vercel.app/payment?status=success
Cancel:  https://teman-nyatet.vercel.app/payment?status=cancelled
```

Rotate any API key, Webhook Signing Secret, or Webhook Token that has appeared
in a screenshot or chat. Store the new provider values only in the Vercel API
project. The backend verifies HMAC headers `X-Sumopod-Signature`/`X-Signature`
using `SUMOPOD_WEBHOOK_SECRET`, or the separate `X-Webhook-Token` using
`SUMOPOD_WEBHOOK_TOKEN`. Either valid credential is sufficient.

### 5. Run Supabase migrations

If this is a fresh Supabase project, run all migration files in order in the SQL Editor. See [`docs/SUPABASE-SETUP.md`](./SUPABASE-SETUP.md).

---

## Cron job setup

`POST /api/cron/archive-expired` archives users with expired subscriptions. Vercel Cron Jobs only support GET, so use an external scheduler.

**With GitHub Actions** (recommended):

```yaml
# .github/workflows/cron.yml
name: Archive expired subscriptions
on:
  schedule:
    - cron: '0 0 * * *'   # daily at midnight UTC
jobs:
  archive:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            https://teman-nyatet-api-server.vercel.app/api/cron/archive-expired
```

**With cron-job.org**: create a POST job to the same URL with `Authorization: Bearer <CRON_SECRET>` header.

---

## Replit development environment

### Workflows

Both workflows are configured in the Replit workspace:

| Workflow | Command | Port |
|---|---|---|
| `artifacts/teman-nyatet: web` | `PORT=5000 pnpm --filter @workspace/teman-nyatet run dev` | 5000 |
| `artifacts/api-server: API Server` | `PORT=8080 pnpm --filter @workspace/api-server run dev` | 8080 |

The Vite dev server proxies `/api/*` → `localhost:8080`, so both services share one origin in the browser.

### Secrets

Set secrets in the Replit Secrets panel (not `.env.local`). See `ENVIRONMENT.md` → Replit secrets section.

### Google OAuth in Replit dev

The `GOOGLE_REDIRECT_URI` defaults to `https://<REPLIT_DEV_DOMAIN>/api/auth/google/callback` when unset. Register this URI in Google Cloud Console → Authorized redirect URIs for dev to work. The `REPLIT_DEV_DOMAIN` env var is set automatically by Replit.

---

## Adding a new environment (staging / preview)

1. Create a new Vercel project (or use a branch deploy)
2. Set all environment variables, with environment-specific values for:
   - `GOOGLE_REDIRECT_URI` — the new environment's callback URL
   - `FRONTEND_URL` — the new environment's frontend URL
   - `ALLOWED_ORIGINS` — the new environment's frontend origin
3. Register the new `GOOGLE_REDIRECT_URI` in Google Cloud Console → Authorized redirect URIs (no wildcard support — register each URL explicitly)
4. Add the new frontend URL to Supabase Redirect URLs

---

## Secret rotation

### Rotating `GOOGLE_OAUTH_STATE_SECRET`

1. Generate: `openssl rand -hex 32`
2. Update in Vercel env → redeploy
3. In-flight OAuth consents will fail with `Bad Request` (HMAC mismatch) — users retry, no data is lost

### Rotating `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`

1. Create new OAuth 2.0 credential in Google Cloud Console
2. Update `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in Vercel env for all projects
3. Existing users will be prompted to re-consent on next data access (server's token refresh returns 401, triggers `GOOGLE_TOKEN_INVALID`, user is redirected to `/connect-sheet`)

### Rotating `CRON_SECRET`

1. Generate: `openssl rand -hex 32`
2. Update in Vercel env
3. Update in your external scheduler's Authorization header

---

## End-to-end verification checklist

After deploying:

- [ ] `GET /api/healthz` → `200 {"status":"ok"}`
- [ ] Frontend loads at `https://teman-nyatet.vercel.app`
- [ ] Sign up → confirmation email received → email confirmed → login works
- [ ] Connect Google Drive → consent screen URL contains the correct `redirect_uri`
- [ ] After Google OAuth → spreadsheet created in user's Drive
- [ ] Create a note → row appears in the user's spreadsheet
- [ ] Summarize a note → API returns a summary (requires `OPENAI_API_KEY` in the Vercel API project)
- [ ] SumoPod Sandbox `Save & Test` succeeds after the current API deployment is live
- [ ] SumoPod `payment.test` does not activate a profile
- [ ] A real SumoPod Sandbox payment sends `payment.completed` and activates the matching plan once
- [ ] Replaying the same SumoPod webhook does not extend the subscription twice
- [ ] Cron endpoint: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" .../api/cron/archive-expired` → `{"archived": N}`
