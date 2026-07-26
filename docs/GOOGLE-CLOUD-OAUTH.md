# Deploy — Production

> This is the detailed Google Cloud Console / OAuth setup walkthrough. For the high-level Vercel deployment runbook, see [`DEPLOYMENT.md`](./DEPLOYMENT.md). For all env vars, see [`ENVIRONMENT.md`](./ENVIRONMENT.md).

This project ships as **two Vercel projects** from a single GitHub repo, each with its own `Root Directory`:

| Project | Root Directory | Output |
|---|---|---|
| `teman-nyatet` (frontend) | `artifacts/teman-nyatet` | `dist/public`, SPA rewrite to `/index.html` |
| `teman-nyatet-api` (backend) | `artifacts/api-server` | `@vercel/node` serverless function at `src/index.ts` |

Both projects share the same env-var contract; **`GOOGLE_REDIRECT_URI` is the one URI the two sides must agree on exactly**, both on Vercel and in the Google Cloud Console.

---

## Production OAuth callback URL

The OAuth flow:

```
frontend → /api/auth/google/initiate (server redirects to Google)
Google consent screen
Google → /api/auth/google/callback (server exchanges code)
```

The canonical production callback URL (pinned, not placeholder):

```
https://teman-nyatet-api-server.vercel.app/api/auth/google/callback
```

This URL must be set with **byte-exact equality** in:

1. **Vercel** — Project `teman-nyatet-api-server` → Settings → Environment Variables → `GOOGLE_REDIRECT_URI` (Production + Preview if you want one for branches).
2. **Google Cloud Console** — OAuth 2.0 Client ID (Application type: **Web application**) → Authorized redirect URIs.

If they disagree, the callback returns `redirect_uri_mismatch`. Server-side priority (`src/lib/google-oauth.ts`) is `env GOOGLE_REDIRECT_URI → REPLIT_DEV_DOMAIN → localhost:5000 fallback`, so without the env var Vercel will fail (no `REPLIT_DEV_DOMAIN` in Vercel runtime) — always set `GOOGLE_REDIRECT_URI` explicitly for production.

---

## Google Cloud Console setup

Once. The OAuth credential is a "Web application" client reused across environments.

### 1. Open the credential

1. https://console.cloud.google.com → your project
2. **APIs & Services → Credentials**
3. Under **OAuth 2.0 Client IDs**, click the entry whose Client ID matches `GOOGLE_CLIENT_ID` in Vercel env vars
4. Confirm Application type is **Web application** (not Android/iOS/Desktop — those won't support this redirect flow)

### 2. Authorized redirect URIs

Add **one URI per environment** that needs to hit the callback:

| Use case | URI |
|---|---|
| Production (Vercel) | `https://teman-nyatet-api-server.vercel.app/api/auth/google/callback` |
| Replit dev (if still developing) | `https://<repl-slug>.<user>.repl.co/api/auth/google/callback` |
| Local laptop | `http://localhost:5000/api/auth/google/callback` |

Rules:
- Lowercase only. Domain case-sensitive in Google's matcher.
- No trailing slash. `/callback` ≠ `/callback/`.
- `https://` enforced for non-localhost. Google rejects plain `http://`.
- Wildcards `*.vercel.app` are NOT supported — register each preview domain explicitly or stick to the production URI for the OAuth credential.

### 3. Authorized JavaScript origins

Lower-priority for this codebase (frontend delegates OAuth through the API server, not directly), but add for completeness:

| Value |
|---|
| `https://teman-nyatet-api-server.vercel.app` |
| `https://teman-nyatet.vercel.app` |

Origin = scheme + host + port, no path. Don't include a trailing slash.

### 4. Save

Click **Save**. Google may take 5–10 minutes to propagate. Server does not need a restart.

---

## OAuth consent screen

Once. App-level, not credential-level.

1. **APIs & Services → OAuth consent screen**
2. **User type**: External (unless only your Workspace users will use the app)
3. **Scopes**: This project requests these scopes server-side (`src/lib/google-oauth.ts` `SCOPES`):

```
https://www.googleapis.com/auth/drive.file             # least-privilege Drive access
https://www.googleapis.com/auth/userinfo.email          # for account identification only
```

`drive.file` falls in the "non-sensitive" scope category — Google does not require formal verification for it. If you ever add `drive`, `gmail`, or contacts scopes, you'll need to submit for verification (separate, multi-week process).

4. **Publishing status**: stays in "Testing" for development (only test users you add by email can complete the flow). For prod, click **Publish App** to remove the 100-user limit.

---

## Vercel env-var contract (api-server)

These keys must be set on Production (and optionally Preview) for the deploy to start:

```bash
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

GOOGLE_CLIENT_ID=<oauth-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-<secret>
GOOGLE_OAUTH_STATE_SECRET=$(openssl rand -hex 32)

MAYAR_WEBHOOK_SECRET=<from-mayar-dashboard>
CRON_SECRET=$(openssl rand -hex 32)

# Production-specific
GOOGLE_REDIRECT_URI=https://teman-nyatet-api-server.vercel.app/api/auth/google/callback
FRONTEND_URL=https://teman-nyatet.vercel.app
ALLOWED_ORIGINS=https://teman-nyatet.vercel.app
NODE_ENV=production
```

**`GOOGLE_OAUTH_STATE_SECRET` MUST be the same secret across both deploys if you ever swap credentials** — it's HMAC-signed for CSRF protection; rotating it invalidates in-flight consent.

`PORT` is **not** set — Vercel assigns its own port. Removing `8080` here avoids confusion during local-vs-prod parity.

---

## Verification after deploy

End-to-end smoke test:

1. `curl -i https://teman-nyatet-api-server.vercel.app/healthz` → 200 OK with `{"status":"ok"}`
2. Browser open `https://teman-nyatet.vercel.app`
3. Log in to Supabase (email/password)
4. Navigate to `/connect-sheet`, click "Hubungkan Google Drive"
5. Confirm the consent screen URL is `https://accounts.google.com/o/oauth2/v2/auth?…&redirect_uri=https%3A%2F%2Fteman-nyatet-api-server.vercel.app%2Fapi%2Fauth%2Fgoogle%2Fcallback…` — if `redirect_uri` matches what you registered, you're correctly configured
6. Approve → browser lands back on `/connect-sheet` then redirects to `/dashboard` or similar
7. Create a note → check that a row appears in the spreadsheet auto-created at the user's Google Drive (`/drive/search?q=owner:me type:spreadsheet type:teman-nyatet`)
8. `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://teman-nyatet-api-server.vercel.app/api/cron/archive-expired` → 200 with `{"archived": N}` (fictional until expiry)

If step 5 redirects to `redirect_uri_mismatch`:

- Re-check Vercel env var shows the exact URI (`https`, no trailing slash, lowercase, full path `…/api/auth/google/callback`).
- Re-check Google Console → Authorized redirect URIs matches byte-for-byte.
- Wait ~5 minutes; Google's update propagation is queued, not instant.

If step 6 lands on the API domain with no redirect to the frontend:

- `FRONTEND_URL` env var is missing or wrong. Server falls back to Vercel function URL itself, doesn't redirect to frontend.

---

## Adding a new environment (preview / staging)

1. Vercel: add the new domain to Project → Domains
2. Google Console: add a new Authorized redirect URI for that domain
3. Vercel: set `GOOGLE_REDIRECT_URI` and `FRONTEND_URL` in the Preview environment of both projects

For a preview branch deploy, the URL is `https://teman-nyatet-api-<git-branch>-<team>.vercel.app/api/auth/google/callback`. Use a wildcard via a custom domain scheme if you want preview branches to share one credential (Google doesn't support `*` wildcards, so you must register each). Alternative: keep OAuth off for preview builds — only allow it on Production.

---

## Rotating secrets

When you need to rotate `GOOGLE_OAUTH_STATE_SECRET` (rare, but happens if leak suspected):

1. Generate new: `openssl rand -hex 32`
2. Update Vercel env → redeploy
3. ⚠️ Any user with an in-flight OAuth consent cannot finish the redirect — they get `Bad Request` for HMAC mismatch. Users will need to retry; nothing is corrupted.

When rotating the OAuth client itself (`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`):

1. Create new credentials in Google Console
2. Update Vercel env for all projects
3. Move any Google refresh tokens to the new credential (existing users will be auto-prompted for consent on next data access; server's `getValidTokens` will receive a 401, force re-initiate)
