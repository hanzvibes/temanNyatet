# Supabase Setup Instructions

> For the full project overview, see [`README.md`](../README.md). For the database schema, see [`DATABASE.md`](./DATABASE.md). For environment variables, see [`ENVIRONMENT.md`](./ENVIRONMENT.md). For OAuth setup, see [`AUTH.md`](./AUTH.md).

## 1. Create Supabase Project
1. Go to https://supabase.com
2. Create a new project
3. Note your project URL and API keys (anon/public key and service role key)

## 2. Run the Migrations

Open your Supabase project dashboard, go to **SQL Editor**, and run the migration files in the following order. The order matters because some later migrations add columns and drop legacy tables.

1. `001_initial_schema.sql` — creates `profiles` and legacy `notes`, `transactions`, `todos`, `links` tables, triggers, and RLS policies
2. `002_add_profile_fields.sql` — adds `name`, `phone`, `avatar_url` to `profiles`
3. `002_add_spreadsheet_id.sql` — adds `spreadsheet_id` to `profiles`
4. `002_add_avatar_url.sql` — also adds `avatar_url` (idempotent, safe to run even if already applied)
5. `003_template_tracking.sql` — adds `template_version` to `profiles`
6. `004_add_google_oauth.sql` — adds `google_refresh_token` to `profiles`
7. `005_phase1_schema.sql` — adds sync tracking columns (`last_sync_at`, `sync_status`, `recovery_metadata`), drops legacy `notes`, `transactions`, `todos`, `links` tables, and refreshes RLS policies
8. `006_ai_credits.sql` — adds AI credit balances, immutable ledger, signup trigger, and atomic credit RPCs

If you already ran `001_initial_schema.sql` before the profile columns existed, run `002_add_profile_fields.sql` to fix the "Gagal memperbarui nama" error.

If you encounter `infinite recursion detected in policy for relation "profiles"`, also run `fix_profiles_rls_recursion.sql` in the SQL Editor. This script drops all existing `profiles` policies and recreates them cleanly.

After applying `006_ai_credits.sql`, leave the default at 10 credits or configure
the PostgreSQL setting below if changing it:

```sql
ALTER DATABASE postgres SET app.initial_ai_credits = '10';
```

The value must match the API server's optional `INITIAL_AI_CREDITS` setting.

## 3. Configure Auth

1. Go to **Authentication → Providers** and make sure **Email** is enabled.
2. Go to **Authentication → Settings**.
3. Enable **Confirm email**. This is required: new accounts cannot log in until they click the confirmation link.
4. Set **Site URL** to your production domain.
   - Current production (Vercel): `https://teman-nyatet.vercel.app`
   - Custom domain (when configured): `https://temannyatet.id`
5. Add **Redirect URLs** so Supabase accepts the callback URLs. Add a broad wildcard per environment:
   - Production: `https://teman-nyatet.vercel.app/**`
   - Vercel previews: `https://*.vercel.app/**`
   - Replit: `https://*.replit.dev/**`
   - Local dev: `http://localhost:5000/**` and `http://localhost:5173/**`

   **Important:** If the redirect URL is not allowed, Supabase falls back to the **Site URL**, which defaults to `http://localhost:3000`. That is why confirmation emails may contain `localhost:3000`.
6. Check **Authentication → Email Templates** → **Confirm signup**. The app uses Supabase's `verifyOtp` PKCE flow — the link must include `token_hash` and `type` parameters pointing to `/auth/confirm`:
   ```html
   <h2>Konfirmasi email kamu</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Konfirmasi Email</a></p>
   ```
   **Do NOT use `{{ .ConfirmationURL }}`** — that bypasses `AuthConfirmPage` and lands the user on the Site URL root, leaving the email unverified.

## 4. Set Environment Variables

### Frontend (Vite) — `.env.local` in `artifacts/teman-nyatet/`
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Optional: canonical domain for Supabase email confirmation links.
# Leave unset for Replit and Vercel previews (the app uses the current origin).
# VITE_SITE_URL=https://temannyatet.id

# Optional: API server base URL when frontend and API are on different origins.
# Leave unset in Replit dev; the Vite dev server proxies /api to localhost:8080.
# For the Vercel frontend project, set:
# VITE_API_SERVER_URL=https://teman-nyatet-api-server.vercel.app
# Production also has this URL as a code fallback if the variable is absent.

```

The API server's AI summarization feature is configured separately on the API
deployment. Set `OPENAI_API_KEY` in the Vercel API project; Replit Secrets do
not propagate to Vercel. `OPENAI_BASE_URL` defaults to
`https://ai.sumopod.com`, and `OPENAI_MODEL` defaults to `gpt-4o-mini`.

### API Server — `.env.local` in `artifacts/api-server/`
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_OAUTH_STATE_SECRET=random-hex-string

SUMOPOD_PAYMENT_API_KEY=your-regenerated-sandbox-api-key
SUMOPOD_PAYMENT_BASE_URL=https://api-pay-sandbox.sumopod.com
# Optional HMAC secret from SumoPod Webhook Signing Secret
SUMOPOD_WEBHOOK_SECRET=your-regenerated-sumopod-signing-secret
SUMOPOD_WEBHOOK_TOKEN=your-regenerated-sumopod-webhook-token
CRON_SECRET=your-random-cron-secret

# Optional: override the OAuth redirect URI (defaults to REPLIT_DEV_DOMAIN or localhost:5000)
# GOOGLE_REDIRECT_URI=https://your-domain.com/api/auth/google/callback

# Optional: override frontend URL for OAuth callback redirects (defaults to REPLIT_DEV_DOMAIN or localhost:5000)
# FRONTEND_URL=https://your-frontend-domain.com
```

## 5. Google OAuth Setup
1. Go to https://console.cloud.google.com
2. Create or select a project
3. Enable the **Google Sheets API** and **Google Drive API**
4. Go to **APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID**
5. Application type: **Web application**
6. Under **Authorized redirect URIs**, add the exact URL shown in `ConnectSheetPage` or the `GOOGLE_REDIRECT_URI` env var.
   For each environment you deploy to:
   - **Production (Vercel)** — pinned: `https://teman-nyatet-api-server.vercel.app/api/auth/google/callback`
   - **Replit dev**: `https://<REPLIT_DEV_DOMAIN>/api/auth/google/callback`
   - **Local**: `http://localhost:5000/api/auth/google/callback`
   - **Vercel preview** (if you want OAuth on previews): `https://teman-nyatet-api-server-<branch>-<team>.vercel.app/api/auth/google/callback` — must be registered explicitly per branch, no wildcards

   Lihat [`docs/GOOGLE-CLOUD-OAUTH.md`](./GOOGLE-CLOUD-OAUTH.md) untuk checklist Google Console lengkap.
7. Copy the Client ID and Client Secret into the API server env vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
8. Generate `GOOGLE_OAUTH_STATE_SECRET` with `openssl rand -hex 32`

## 6. SumoPod Sandbox Setup
1. Create or open the SumoPod Sandbox project.
2. Configure the API Server Vercel project with
   `SUMOPOD_PAYMENT_API_KEY` and
   `SUMOPOD_PAYMENT_BASE_URL=https://api-pay-sandbox.sumopod.com`.
3. In SumoPod Settings → Webhook, set:
   `https://teman-nyatet-api-server.vercel.app/api/sumopod-webhook`
4. Configure Redirect URLs:
   - Success: `https://teman-nyatet.vercel.app/payment?status=success`
   - Cancel: `https://teman-nyatet.vercel.app/payment?status=cancelled`
5. Rotate any API key, Webhook Signing Secret, or Webhook Token that appeared
   in a screenshot or chat. Store new values only in Vercel.
6. Use the Webhook Signing Secret for `SUMOPOD_WEBHOOK_SECRET` if HMAC
   signing is enabled. The Webhook Token is a separate credential and is not
   currently validated by the backend.
7. Before clicking **Save & Test**, redeploy the API Vercel project from
   `main` with Root Directory `artifacts/api-server`; the last observed
   deployment returned `404 Cannot POST /api/sumopod-webhook`; verify the active
   API deployment's webhook route directly after redeploying.

## 7. Vercel Cron (Optional)
Add to `vercel.json` at the API server root directory:
```json
{
  "crons": [
    {
      "path": "/api/cron/archive-expired",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Note: the current endpoint is `POST /api/cron/archive-expired` with a Bearer `CRON_SECRET` token. Vercel Cron Jobs only support GET, so if you want to use Vercel Cron, add a GET handler to the route or call it from an external scheduler.

## 8. Profile Photos (optional)
Photos are uploaded through the API server (`POST /api/profile/avatar`) and stored in a Supabase Storage bucket called `avatars` (created automatically on first upload). No extra storage RLS setup is needed — uploads always go through the service role key server-side.

## Table Summary

| Table | Purpose |
|-------|---------|
| `profiles` | User subscription info, name/phone/avatar, Google OAuth tokens, and spreadsheet ID. Auto-created on signup. |
| `user_credits` | Current per-user AI summarization credit balance. |
| `credit_ledger` | Immutable audit history for credit consumption and grants. |
| `notes` | Legacy table — created by `001_initial_schema.sql`, dropped by `005_phase1_schema.sql`. Not used. |
| `transactions` | Legacy table — created by `001_initial_schema.sql`, dropped by `005_phase1_schema.sql`. Not used. |
| `todos` | Legacy table — created by `001_initial_schema.sql`, dropped by `005_phase1_schema.sql`. Not used. |
| `links` | Legacy table — created by `001_initial_schema.sql`, dropped by `005_phase1_schema.sql`. Not used. |

App data is selected through the API data-store boundary: migrated allowlisted
users use SumoPod PostgreSQL, while other users use their private Google
Spreadsheet. Supabase stores auth, profiles, subscriptions, payment metadata,
and AI credits. The `profiles` table has RLS enabled — users can only access
their own row.
