# TROUBLESHOOTING.md — TemanNyatet

> Common problems and their solutions. See [`AUTH.md`](./AUTH.md) for OAuth-specific errors, [`DEPLOYMENT.md`](./DEPLOYMENT.md) for deploy issues.

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| AUTH — OAuth-specific errors | [`AUTH.md`](./AUTH.md) |
| DEPLOYMENT — deploy issues & verification | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| ENVIRONMENT — env vars & secrets | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| replit.md — Replit-specific issues | [`replit.md`](./replit.md) |

---

## Auth / Login

### "Email not confirmed" loop

**Symptom**: User signs in but immediately gets logged out.  
**Cause**: `AuthContext` enforces email confirmation — if `user.email_confirmed_at` is null, it calls `signOut()`.  
**Fix**:
1. Check Supabase → Authentication → Users. Find the user.
2. If email is unconfirmed, click "Send confirmation email" or manually confirm.
3. Ensure Supabase → Authentication → Settings → "Confirm email" is ON.
4. Check Email Templates → "Confirm signup" uses the token_hash OTP format pointing to `/auth/confirm`:
   ```
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```
   If the template still uses `{{ .ConfirmationURL }}`, users will land on the wrong page and verification won't complete.

### Confirmation link says "Verifikasi Gagal"

**Symptom**: User clicks the email confirmation link but `AuthConfirmPage` shows an error.  
**Cause**: The link has already been used, is expired, or the email template format is wrong.  
**Fix**:
1. Links are single-use. Ask the user to request a new confirmation email and click the fresh link.
2. Confirm the Supabase email template uses `token_hash={{ .TokenHash }}&type=email` — not `{{ .ConfirmationURL }}`.
3. If expired, check Supabase → Auth → Settings → "Email OTP expiry" (default 3600 s).

### "infinite recursion detected in policy for relation profiles"

**Symptom**: Profile loads fail with a Supabase RLS recursion error.  
**Fix**: Run `fix_profiles_rls_recursion.sql` in the Supabase SQL Editor. This drops and recreates `profiles` RLS policies cleanly.

### Profile not created after sign-up

**Symptom**: User signs in but app can't load profile, gets stuck loading.  
**Cause**: The `on_auth_user_created` trigger may have failed (e.g., if `profiles` table didn't exist yet).  
**Fix**: `AuthContext` has a client-side fallback upsert — it will create the profile row on first load. If it still fails, check that all migrations have been run in order (see [`docs/SUPABASE-SETUP.md`](./SUPABASE-SETUP.md)).

---

## Google OAuth / Spreadsheet

### `redirect_uri_mismatch`

**Symptom**: After clicking "Hubungkan Google Drive", Google returns `redirect_uri_mismatch`.  
**Cause**: `GOOGLE_REDIRECT_URI` env var doesn't match the URI registered in Google Cloud Console.  
**Fix**:
1. Check the actual URI the server is using: `GET /api/auth/google/status` returns the configured redirect URI, or check Vercel env var.
2. In Google Cloud Console → OAuth 2.0 Client ID → Authorized redirect URIs → verify it matches byte-for-byte (lowercase, no trailing slash, full path: `.../api/auth/google/callback`).
3. Wait 5–10 minutes after saving in Google Console (propagation delay).

### `GOOGLE_NOT_CONNECTED` (428 error)

**Symptom**: API returns 428 with `"error": "GOOGLE_NOT_CONNECTED"`.  
**Cause**: User hasn't completed Google OAuth yet, or was disconnected.  
**Fix**: User needs to go to `/connect-sheet` and click "Hubungkan Google Drive".

### `GOOGLE_TOKEN_INVALID`

**Symptom**: App redirects to `/connect-sheet?error=GOOGLE_TOKEN_INVALID` after the user was previously connected.  
**Cause**: User revoked access in their Google Account settings, or the OAuth credential was rotated.  
**Fix**: User reconnects via `/connect-sheet`. A new spreadsheet will be created.

### `SPREADSHEET_NOT_FOUND`

**Symptom**: App redirects to `/connect-sheet?error=SPREADSHEET_NOT_FOUND`.  
**Cause**: User deleted the spreadsheet from their Google Drive.  
**Fix**: User reconnects — a fresh spreadsheet is created. Previous data is lost (it was in the deleted spreadsheet).

### Spreadsheet missing tabs / wrong headers

**Symptom**: API returns errors like "sheet tab not found" or data isn't loading correctly.  
**Fix**: Call `POST /api/spreadsheet/repair` (requires auth). This recreates missing tabs and repairs header rows without touching existing data rows. Available via the app's settings → "Perbaiki Spreadsheet".

### OAuth callback doesn't redirect back to frontend

**Symptom**: After Google consent, browser stays on the API server domain.  
**Cause**: `FRONTEND_URL` env var is missing or incorrect.  
**Fix**: Set `FRONTEND_URL` to the frontend URL (e.g., `https://teman-nyatet.vercel.app`) in Vercel env vars for the API server project. Redeploy.

---

## Subscription / Payment

### User paid but `subscription_status` is still `pending`

**Symptom**: User completed Mayar payment but the app still shows the payment wall.  
**Cause**: Mayar webhook wasn't received, or `MAYAR_WEBHOOK_SECRET` mismatch.  
**Fix**:
1. Verify the webhook URL in Mayar dashboard is `https://teman-nyatet-api-server.vercel.app/api/mayar-webhook`.
2. Check API server logs for webhook requests.
3. If `MAYAR_WEBHOOK_SECRET` is not set, the endpoint returns `503` — check env vars.
4. If signature verification fails, the webhook is rejected — rotate `MAYAR_WEBHOOK_SECRET` and update both Mayar dashboard and Vercel env vars.
5. Manually activate: update `profiles.subscription_status = 'active'` and set `subscription_plan` + `subscription_end` via Supabase SQL Editor.

---

## Data / Google Sheets

### Notes/transactions not loading (spinning forever)

**Symptom**: `PageLoading` spinner doesn't resolve.  
**Cause**: API server not running, or Google Sheets API call failing.  
**Fix**:
1. Check `GET /healthz` → should return `{"status":"ok"}`.
2. Check `GET /api/auth/google/status` → should show `connected: true`.
3. Check API server logs for Google API errors.
4. Try `POST /api/spreadsheet/repair` to fix missing tabs.

### Data appears stale / not updating

**Symptom**: Changes made on another device don't appear.  
**Cause**: Data hooks poll every 15 s; TanStack Query `staleTime: 30 s`.  
**Fix**: Wait up to 30 s, or switch away from the tab and back (triggers `refetchOnWindowFocus`).

### "Gagal menyimpan" toast but no clear error

**Symptom**: Create/update/delete action fails with a generic Indonesian error toast.  
**Cause**: API returned an error (network, Google API rate limit, validation).  
**Fix**:
1. Open browser DevTools → Network tab → find the failing `/api/...` request → read the response body.
2. Common: `SPREADSHEET_NOT_FOUND` or `GOOGLE_TOKEN_INVALID` → reconnect Google Drive.
3. Common: 429 Too Many Requests → Google Sheets API rate limit — wait 60 s and retry.

---

## PWA / Installation

### PWA install prompt not showing

**Symptom**: "Pasang Aplikasi" banner never appears.  
**Cause**:
- Already installed (browser won't prompt again)
- HTTPS required (HTTP won't trigger install)
- Service worker not registered (check console for SW errors)
- Browser doesn't support PWA install (Firefox desktop)

**Fix**: The prompt appears after 3 seconds if the PWA criteria are met. On Replit dev, install works because `devOptions: { enabled: true }` is set in `vite.config.ts`.

### Old cached version still showing after update

**Symptom**: Users are running a stale version of the app.  
**Fix**: The app uses `registerType: 'prompt'` — a `PwaUpdatePrompt` component appears when a new service worker is available. If dismissed, the update applies on the next full reload. Users can force-update by clearing site cache in browser settings.

---

## Development / Replit

### API server workflow not starting

**Symptom**: `artifacts/api-server: API Server` workflow fails or exits immediately.  
**Cause**: Missing required env vars — the server checks all required vars on startup and exits with an error message listing the missing ones.  
**Fix**: Add all required secrets to the Replit Secrets panel. Required: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`, `CRON_SECRET`.

### TypeScript error: `lib/api-client-react/dist/index.d.ts` not found

**Symptom**: `tsc --noEmit` fails with "Output file has not been built from source".  
**Cause**: `lib/api-client-react` hasn't been built — its `dist/` directory is missing.  
**Fix**: Run `pnpm --filter @workspace/api-client-react run build`. This is a pre-existing dev issue; it doesn't affect the Vite dev server or production build.

### `/api/*` requests returning 404 or CORS errors in dev

**Symptom**: API calls fail in the browser during local development.  
**Cause**: API server not running, or Vite proxy not active.  
**Fix**:
1. Ensure the `artifacts/api-server: API Server` workflow is running on port 8080.
2. The Vite dev server proxy (`/api` → `localhost:8080`) is only active when running `vite dev` — not in `vite preview`.
3. Never use `localhost` URLs directly in frontend code — use relative `/api/...` paths.

### pnpm version mismatch

**Symptom**: `pnpm install` fails or warns about package manager version.  
**Cause**: pnpm version doesn't match the pinned `pnpm@10.26.1` in root `package.json`.  
**Fix**: Install the pinned version: `npm install -g pnpm@10.26.1`. Do not upgrade to pnpm 11 without migrating `onlyBuiltDependencies` → `allowBuilds`.
