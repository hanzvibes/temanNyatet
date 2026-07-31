# AUTH.md — TemanNyatet Authentication & Authorization

> See also: [`API.md`](./API.md) (route auth requirements), [`DATABASE.md`](./DATABASE.md) (profiles table), [`ENVIRONMENT.md`](./ENVIRONMENT.md) (required secrets).

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| AI_CONTEXT — quick reference for AI agents | [`AI_CONTEXT.md`](./AI_CONTEXT.md) |
| ARCHITECTURE — auth middleware & flow | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| API — route auth requirements | [`API.md`](./API.md) |
| DATABASE — profiles table schema | [`DATABASE.md`](./DATABASE.md) |
| ENVIRONMENT — OAuth secrets & redirect URIs | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| SECURITY — security controls | [`SECURITY.md`](./SECURITY.md) |

---

## Overview

TemanNyatet has two distinct auth layers:

| Layer | Technology | Purpose |
|---|---|---|
| **User identity** | Supabase Auth | Sign up, sign in, session management, email confirmation |
| **Data access** | Google OAuth 2.0 | Per-user Google Drive access (Sheets + Drive API) |

Both must be completed before a user can access app features.

---

## Part 1 — Supabase Auth (user identity)

### Supported method

Email + password only. OAuth social providers are not configured.

### Sign-up flow

```
1. User submits email + password on /login (AuthPage)
2. supabase.auth.signUp() → creates auth.users row
3. Supabase sends confirmation email with link to <SITE_URL>/auth/confirm?token_hash=<hash>&type=email
4. Trigger creates profiles row with subscription_status: 'pending'
5. User clicks confirmation link → lands on AuthConfirmPage (/auth/confirm)
6. AuthConfirmPage calls supabase.auth.verifyOtp({ token_hash, type }) → email confirmed
7. AuthConfirmPage redirects to /login on success
8. User logs in → session issued
```

> ⚠️ The Supabase email template must use the token_hash OTP format, not `{{ .ConfirmationURL }}`.
> See the Supabase configuration checklist below for the correct template.

### Session management (frontend)

`AuthContext` (`artifacts/teman-nyatet/src/contexts/AuthContext.tsx`):

- Calls `supabase.auth.getSession()` on mount
- Subscribes to `supabase.auth.onAuthStateChange()`
- If `user.email_confirmed_at` is null → `supabase.auth.signOut()` (enforced)
- Loads the `profiles` row after session is established
- Fallback upsert: if `profiles` row doesn't exist (trigger didn't fire), creates it client-side

### Token usage

The Supabase access token (JWT) is sent as a Bearer token in every API request:

```typescript
// artifacts/teman-nyatet/src/main.tsx
apiClient.setTokenGetter(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
});
```

`apiClient.ts` automatically retries once on `401` responses after refreshing the token.

### API server verification

`requireUser` middleware (`artifacts/api-server/src/middleware/requireAuth.ts`):

```
1. Extract Bearer token from Authorization header
2. supabaseAdmin.auth.getUser(token) → verifies JWT server-side
3. Check user.email_confirmed_at → reject if null (401)
4. Attach req.userId = user.id
```

### Auth guard (frontend routing)

`AuthGuard` in `App.tsx` enforces these redirects:

| State | Redirect |
|---|---|
| Not authenticated (not on a public route) | `/login` |
| Authenticated, `spreadsheet_id` is null | `/connect-sheet` |
| `subscription_status === 'pending'` | `/payment` |
| `subscription_status === 'archived'` | `/archived` |
| `subscription_status === 'active'`, on auth-only route | `/catatan` |

**Public routes** (no auth required, unauthenticated users are not redirected): `/login`, `/auth/confirm`.

---

## Part 2 — Google OAuth 2.0 (data access)

### Why Google OAuth

App data (notes, transactions, todos, links) is stored in a private Google Spreadsheet in each user's own Google Drive. The API server needs OAuth tokens to read/write this spreadsheet on the user's behalf.

### Scopes requested

```
https://www.googleapis.com/auth/drive.file    # Create + access files the app created
https://www.googleapis.com/auth/userinfo.email # Identify the account (verification only)
```

`drive.file` is a least-privilege scope — the app can only access spreadsheets it created, not the user's entire Drive.

### OAuth flow

```
Frontend                 API Server              Google
   │                        │                      │
   │ GET /api/auth/google/  │                      │
   │ initiate               │                      │
   │ ──────────────────────►│                      │
   │                        │ generate state HMAC  │
   │ { url: "https://..." } │                      │
   │ ◄──────────────────────│                      │
   │                        │                      │
   │ redirect browser to Google consent screen     │
   │ ──────────────────────────────────────────────►
   │                        │                      │
   │       user approves    │                      │
   │ ◄──────────────────────────────────────────── │
   │ /api/auth/google/callback?code=...&state=...  │
   │                        │                      │
   │                        │ verify HMAC state    │
   │                        │ exchange code        │
   │                        │ create spreadsheet   │
   │                        │ init sheet tabs      │
   │                        │ save to profiles     │
   │                        │                      │
   │ redirect to FRONTEND_URL                       │
   │ ◄──────────────────────│                      │
```

### CSRF protection

`state` parameter is HMAC-SHA256 signed using `GOOGLE_OAUTH_STATE_SECRET`. The server verifies the signature on callback before processing the code. A missing or invalid state → `400 Bad Request`.

### Token storage

After OAuth:
- `google_refresh_token` stored in `profiles.google_refresh_token` (Supabase, service role encrypted at rest)
- `spreadsheet_id` stored in `profiles.spreadsheet_id`

The API server resolves the sheets client per request:
```
requireAuth → user-sheet.ts → reads (spreadsheet_id, google_refresh_token) from profiles
            → builds google.auth.OAuth2 client with refresh token
            → attaches sheetsClient to req.sheetsClient
```

Tokens are refreshed automatically by the Google SDK when they expire.

### Error codes from Google OAuth

| Code | Meaning | User action |
|---|---|---|
| `GOOGLE_NOT_CONNECTED` | No refresh token in profiles | Connect Google Drive at `/connect-sheet` |
| `GOOGLE_TOKEN_INVALID` | Refresh token revoked | Reconnect Google Drive |
| `SPREADSHEET_NOT_FOUND` | Spreadsheet deleted from Drive | Reconnect (new spreadsheet will be created) |
| `SPREADSHEET_ACCESS_DENIED` | Permissions changed | Reconnect Google Drive |

When the frontend receives one of these codes, it dispatches `window.dispatchEvent(new CustomEvent('teman-nyatet:spreadsheet-error', { detail: { code } }))` which `AuthGuard` listens to and redirects to `/connect-sheet?error=<code>`.

### Disconnect flow

`DELETE /api/auth/google/disconnect`:
1. Revokes the Google refresh token via Google API
2. Clears `spreadsheet_id` and `google_refresh_token` in profiles
3. User's spreadsheet remains in their Google Drive — it is never deleted by the app

---

## Part 3 — Subscription authorization

Handled entirely in the frontend `AuthGuard`. The `subscription_status` field in `profiles` drives access:

| Status | Access |
|---|---|
| `pending` | Redirected to `/payment` page (SumoPod Sandbox payment link) |
| `active` | Full access to all four feature modules |
| `archived` | Redirected to `/archived` page |

Subscription activation is triggered only by a validated SumoPod
`payment.completed` event at `POST /api/sumopod-webhook`. The server matches
the local payment order, provider payment ID, amount, and plan before calling
`activateSubscription()`. The legacy Mayar webhook is compatibility-only and
is not used by the current frontend checkout.

---

## Part 4 — Cron endpoint auth

`POST /api/cron/archive-expired` uses a separate simple Bearer token (`CRON_SECRET`), not a Supabase JWT. This is not user auth — it is a service-to-service secret for the scheduler.

---

## Supabase configuration checklist

| Setting | Value |
|---|---|
| Provider | Email enabled |
| Confirm email | **Must be ON** |
| Site URL | `https://teman-nyatet.vercel.app` (or your custom domain) |
| Redirect URLs | `https://teman-nyatet.vercel.app/**`, `https://*.vercel.app/**`, `https://*.replit.dev/**`, `http://localhost:5000/**`, `http://localhost:5173/**` |

**Email template — Confirm signup**: Must use the token_hash OTP format so `AuthConfirmPage` can verify the email:

```html
<h2>Konfirmasi email kamu</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Konfirmasi Email</a></p>
```

Do **not** use `{{ .ConfirmationURL }}` — that redirects to the Site URL root, bypassing `AuthConfirmPage`.

If "Confirm email" is off, users can log in without verifying — the client-side check in `AuthContext` will still sign them out, creating a confusing loop.

---

## Google Cloud Console checklist

| Setting | Value |
|---|---|
| Application type | Web application |
| Authorized redirect URIs | `https://teman-nyatet-api-server.vercel.app/api/auth/google/callback` (production), plus dev URIs per environment |
| Scopes | `drive.file`, `userinfo.email` |
| Publishing status | Published (to remove 100-user test limit) |

See [`docs/DEPLOYMENT.md`](./DEPLOYMENT.md) and [`docs/GOOGLE-CLOUD-OAUTH.md`](./GOOGLE-CLOUD-OAUTH.md) for the full Google Cloud Console setup walkthrough.
