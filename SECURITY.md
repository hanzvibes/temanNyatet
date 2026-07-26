# SECURITY.md — TemanNyatet

> Documents the security controls currently implemented. See [`AUTH.md`](./AUTH.md) for auth-specific security details.

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](./README.md) |
| AUTH — auth-specific security details | [`AUTH.md`](./AUTH.md) |
| ENVIRONMENT — secret management & env vars | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| DECISIONS — security-related ADRs | [`DECISIONS.md`](./DECISIONS.md) |
| DEPLOYMENT — secret rotation procedures | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |

---

## Authentication security

| Control | Implementation |
|---|---|
| Password storage | Supabase Auth — bcrypt hashed, never seen by this app |
| JWT verification | Server-side via `supabaseAdmin.auth.getUser(token)` on every request |
| Email confirmation | Required — `AuthContext` signs out unconfirmed users; server checks `email_confirmed_at` |
| Session token | Supabase short-lived access token + refresh token; auto-refreshed by client |
| Service role key | API server only; never in frontend bundle; validated at server startup |

---

## OAuth 2.0 security

| Control | Implementation |
|---|---|
| CSRF protection | `state` param HMAC-SHA256 signed with `GOOGLE_OAUTH_STATE_SECRET`; verified on callback |
| Scope minimization | `drive.file` (least privilege — only app-created files) + `userinfo.email` |
| Token storage | Refresh token stored in `profiles.google_refresh_token` (Supabase Postgres, encrypted at rest) |
| Token revocation | `DELETE /api/auth/google/disconnect` revokes token via Google API |
| Redirect URI enforcement | `GOOGLE_REDIRECT_URI` must be byte-exact match with Google Cloud Console; any mismatch → OAuth rejects |

---

## API server security

| Control | Implementation |
|---|---|
| Security headers | Helmet middleware (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Configurable via `ALLOWED_ORIGINS`; restricts cross-origin requests in production |
| Rate limiting (global) | 300 requests / 15 minutes per IP (`express-rate-limit`) |
| Rate limiting (per user) | 120 requests / minute per authenticated user (`express-rate-limit`, in-memory) |
| Request body size | 256 KB limit (`express.json` + `express.urlencoded`) |
| Webhook signature | Mayar webhook: HMAC-SHA256 with constant-time comparison (`crypto.timingSafeEqual`) |
| Cron auth | `CRON_SECRET` Bearer token — simple but separate from user JWTs |
| Formula injection | Cell values starting with `=`, `+`, `-`, `@`, tab, carriage return are prefixed with `'` (CSV formula injection mitigation) |
| Input validation | Custom `validate.ts` with `requireString` / `optionalString` / `optionalTags` — max lengths enforced |
| User isolation | All Google Sheets reads filter by `user_id` column — users can only access their own rows |

---

## Data security

| Control | Implementation |
|---|---|
| Data isolation | Each user's data is in their own private Google Spreadsheet — physically isolated |
| RLS | Supabase RLS on `profiles` — users can only read/update their own row |
| Profile access | Only service role key (server-side) and the authenticated user's own JWT can read their profile |
| Avatar uploads | Server-side only via service role key — no direct frontend-to-Supabase storage uploads |
| Sensitive columns | `google_refresh_token` is never returned in API responses; only used internally |

---

## Transport security

- All production traffic over HTTPS (enforced by Vercel and Supabase)
- Vercel automatically provisions TLS certificates
- `HSTS` header set by Helmet

---

## Known limitations

| Limitation | Risk | Mitigation |
|---|---|---|
| In-process rate limit | Lost on serverless function cold starts (Vercel); no shared state across instances | Acceptable for current scale; DDoS mitigation at Vercel edge |
| In-process sheet lock | Doesn't work with horizontal scaling | Vercel serverless is single-instance per invocation; acceptable risk |
| No audit log | No record of which operations touched which spreadsheet row | Low priority for current scale |
| `fix_profiles_rls_recursion.sql` is ad-hoc | Not in numbered migration sequence; could be missed on fresh deploy | Documented in `supabase/migrations/README.md`; should be promoted to numbered migration |
| Mayar plan resolution uses heuristics | Incorrect plan assignment if Mayar changes payload structure | Low risk; plan assignment reviewed in webhook handler |

---

## Secret management

- Never commit secrets to the repository
- Replit: use Secrets panel (never `.env` files in the workspace)
- Vercel: use Environment Variables in project settings
- Local dev: `.env.local` files (in `.gitignore`)
- Rotate `GOOGLE_OAUTH_STATE_SECRET` if a breach is suspected — see `DEPLOYMENT.md` → Secret rotation

---

## Incident response

If `GOOGLE_CLIENT_SECRET` or `SUPABASE_SERVICE_ROLE_KEY` is compromised:

1. Rotate immediately in Google Cloud Console / Supabase dashboard
2. Update Vercel and Replit env vars
3. Redeploy
4. Revoke and reissue `GOOGLE_OAUTH_STATE_SECRET` (invalidates in-flight OAuth consents — users retry)
5. For `SUPABASE_SERVICE_ROLE_KEY` breach: all existing sessions should be considered compromised — notify Supabase support to rotate the JWT secret
