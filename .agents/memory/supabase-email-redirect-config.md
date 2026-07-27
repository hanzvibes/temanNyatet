---
name: Supabase email redirect configuration
description: Why TemanNyatet confirmation emails can point to localhost:3000 and how to verify/fix the Supabase Auth settings.
---

# Supabase email redirect configuration

## Root cause of `localhost:3000` in confirmation emails

Supabase Auth uses two related settings to decide the URL that appears in confirmation, password-reset, and magic-link emails:

1. **Site URL** (`Authentication → Settings → Site URL`) — the default/fallback redirect origin.
2. **Redirect URLs** (`Authentication → Settings → Redirect URLs`) — allowlist of URLs the app is allowed to request via `emailRedirectTo` / `redirectTo`.

The app sends `emailRedirectTo: <SITE_URL>/login?confirmed=true` in `supabase.auth.signUp()` and `supabase.auth.resend()`. If that URL is **not** in the Redirect URLs allowlist, Supabase silently falls back to the **Site URL**. A newly created Supabase project defaults to `http://localhost:3000`, so the email link becomes `http://localhost:3000`.

**Why:** This is not a frontend bug. The `siteUrl.ts` helper already computes the correct environment-specific URL (`VITE_SITE_URL` or `window.location.origin`). Supabase discards it because the allowlist is too restrictive.

## How to fix

In the Supabase dashboard:

1. Set **Site URL** to the production domain (e.g., `https://teman-nyatet.vercel.app`).
2. Add **Redirect URLs** for every environment that sends auth emails:
   - Production: `https://teman-nyatet.vercel.app/login` and `https://teman-nyatet.vercel.app/**`
   - Vercel previews: `https://*.vercel.app/login` and `https://*.vercel.app/**`
   - Replit: `https://*.replit.dev/login` and `https://*.replit.dev/**`
   - Local dev: `http://localhost:5173/login`, `http://localhost:5173/**`, `http://localhost:5000/login`, `http://localhost:5000/**`
3. Check **Authentication → Email Templates → Confirm signup** and use `{{ .ConfirmationURL }}` instead of a hardcoded `http://localhost:3000` URL.

## How to verify from the backend

Use the service role key to generate a signup link and inspect the `redirect_to` query parameter in the returned `action_link`:

```bash
curl -s -X POST "$SUPABASE_URL/auth/v1/admin/generate_link" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $VITE_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"type":"signup","email":"test@example.com","password":"...","options":{"redirect_to":"https://<environment>/login?confirmed=true"}}' \
  | jq -r '.action_link'
```

If the result contains `redirect_to=http://localhost:3000`, the Redirect URL is not in the allowlist or the Site URL is still localhost:3000.

## App-side enforcement

Even when the Supabase project is configured correctly, the app enforces verification client-side as a defense-in-depth measure:

- `AuthContext` signs out any session whose `email_confirmed_at` is missing.
- `AuthPage` rejects the returned session on login if `email_confirmed_at` is missing, and shows a "Verifikasi Email Diperlukan" screen with a **Kirim Ulang Email Verifikasi** button.
- If the server returns a session immediately after `signUp` (because email confirmation is disabled in Supabase), the app signs the user out and forces the verification UI.

## Related files

- `artifacts/teman-nyatet/src/lib/siteUrl.ts` — computes the redirect URL.
- `artifacts/teman-nyatet/src/pages/AuthPage.tsx` — login, signup, resend verification.
- `artifacts/teman-nyatet/src/pages/AuthConfirmPage.tsx` — handles `/auth/confirm?token_hash=...` for in-app confirmation links.
- `docs/SUPABASE-SETUP.md` — step-by-step dashboard configuration.
- `replit.md` — Replit-specific email verification setup notes.
