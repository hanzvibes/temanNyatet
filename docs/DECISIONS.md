# DECISIONS.md — TemanNyatet Architecture Decisions

> Documents the *why* behind major technical choices. Helps future maintainers understand tradeoffs before changing direction.

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| ARCHITECTURE — system architecture that implements these decisions | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| ROADMAP — completed / planned / future | [`ROADMAP.md`](./ROADMAP.md) |
| SECURITY — security implications | [`SECURITY.md`](./SECURITY.md) |

---

## ADR-001: Google Sheets as the app data backend

**Decision**: Store all user app data (notes, transactions, todos, links) in a private Google Spreadsheet in each user's own Google Drive — not in a shared database.

**Why**:
- User owns their data — they can view, export, or delete it directly from Google Sheets
- No server-side storage cost that scales with number of users
- Indonesian market trust: many users are cautious about storing personal/financial data on a third-party server
- Google Drive provides free storage under the 15 GB limit for most users
- `drive.file` scope is least-privilege — the app can only access spreadsheets it created

**Tradeoffs accepted**:
- No cross-user queries, aggregations, or reporting
- Google API rate limits apply (mitigated by per-user isolation)
- In-process sheet lock (`sheetLocks` Map) doesn't work with horizontal scaling
- All data is stored as strings in cells; type coercion is handled manually in `sheet-store.ts`
- Soft-delete to `_Archive` tab rather than physical deletion (can be cleaned up manually)

---

## ADR-002: Supabase for authentication and profile only

**Decision**: Use Supabase Auth for user identity and a single `profiles` table for subscription/metadata. No app data in Supabase.

**Why**:
- Managed auth with email confirmation, RLS, and JWT issuance out of the box
- `profiles` table is a natural fit — one row per user, small, infrequently updated
- Keeps the data backend decision (Google Sheets) orthogonal to auth

**Tradeoffs accepted**:
- Two external dependencies (Supabase + Google) instead of one
- JWT verification adds a round-trip on each API request (mitigated by Supabase Admin SDK's in-process call)
- Supabase service role key must be kept server-side — never exposed to the frontend

---

## ADR-003: Custom CachedSwitch instead of wouter's Switch

**Decision**: Every visited page stays mounted in the DOM via the `hidden` attribute. Only the active page is visible. Navigation uses DOM show/hide, not React unmount/remount.

**Why**:
- wouter's `<Switch>` unmounts the inactive route on every navigation, destroying React state and TanStack Query cache
- Back-tab trips triggered unnecessary API refetches (default `staleTime: 0`)
- Lazy chunk re-evaluation on every tab switch caused perceptible flash
- CachedSwitch + `staleTime: 30s` delivers instant tab switches with silent background revalidation

**Tradeoffs accepted**:
- All visited pages are kept in the DOM — slightly more memory usage
- `hidden` attribute and `aria-hidden` must be maintained correctly
- Page lifecycle events (mount/unmount) don't fire on tab switch — components must not rely on unmount for cleanup

---

## ADR-004: Custom data hooks with module-level Map cache instead of TanStack Query `useQuery`

**Decision**: The four data hooks (`useNotes`, `useTransactions`, `useTodos`, `useLinks`) use module-level `Map` caches and 15-second polling via `useEffect` rather than `useQuery`.

**Why**: These hooks were written before TanStack Query was adopted. The module-level cache survives route unmounts even without CachedSwitch (pre-dates it). Migrating would require careful invalidation logic.

**Tradeoffs accepted**:
- Two caching systems exist in the app (module Map + TanStack Query)
- Polling every 15 s regardless of focus/visibility
- No automatic retry on failure (errors are surfaced via toast)
- `QueryClient` is used only for defaults and future invalidation, not for these hooks' actual data fetching

**Future direction**: Migrate data hooks to `useQuery` to unify caching, gain automatic retry, and eliminate the module-level Map.

---

## ADR-005: React + Vite SPA instead of Next.js

**Decision**: Frontend is a Vite SPA deployed to Vercel as a static site with SPA rewrite. Server-side requirements (webhooks, OAuth callback, cron) are Express routes in the separate API server.

**Why**:
- The Replit workspace scaffolds React + Vite — this was the starting point
- Server-side rendering is not needed for this app (all data is user-specific, no public pages to index)
- Simpler build pipeline; Vite's dev experience is faster than Next.js for this use case
- SPA + Express API separation keeps concerns clean

**Tradeoffs accepted**:
- No SSR for SEO (not needed — app is behind auth)
- Two Vercel projects instead of one
- No file-based routing — routes are declared in `ROUTE_ENTRIES` in `App.tsx`

---

## ADR-006: SumoPod for payments (not Mayar or Stripe)

**Decision**: Use SumoPod Payment Gateway for the current checkout flow,
starting with Sandbox. The frontend requests a payment link from the API;
provider credentials remain server-side.

**Why**: Mayar is an Indonesian payment gateway that supports local payment methods (GoPay, OVO, Dana, bank transfer). Stripe does not support Indonesian local payment methods out of the box.

**Tradeoffs accepted**:
- Sandbox must be replaced with production provider configuration before a
  public launch.
- Webhook reconciliation depends on the provider delivering a compatible
  `payment.completed` payload.
- The old Mayar route remains only for compatibility and must not be treated as
  the active payment integration.

---

## ADR-007: Two Vercel projects from one repo

**Decision**: Deploy frontend and API server as two separate Vercel projects with different Root Directories from the same GitHub repo.

**Why**:
- Frontend needs static SPA output with rewrite rules
- API server needs `@vercel/node` serverless function runtime
- Vercel doesn't support multiple runtimes in one project
- Both can share the same GitHub repo and branch

**Tradeoffs accepted**:
- `GOOGLE_REDIRECT_URI` must be set explicitly — it can't be derived automatically on Vercel
- Preview branches get separate URLs — must register each in Google Cloud Console (no wildcard support)
- Two sets of env vars to maintain

---

## ADR-008: Email confirmation required

**Decision**: Supabase "Confirm email" is required. Users who haven't confirmed are signed out by `AuthContext` even if Supabase issues them a session.

**Why**: Prevents throwaway email sign-ups from consuming subscription slots. Each user gets a Google Spreadsheet on their connected Drive — access should be tied to a verified email.

**Tradeoffs accepted**:
- Slightly more friction at sign-up (must check email)
- Client-side enforcement in `AuthContext` is a defense-in-depth measure, not the primary check

---

## ADR-009: Per-user OAuth, not service account

**Decision**: The API server accesses Google Sheets via per-user OAuth2 tokens (stored in `profiles.google_refresh_token`), not a shared service account.

**Why**: Service accounts have no Google Drive quota (0 bytes). A service account creating spreadsheets in its own Drive would hit quota limits quickly. With per-user OAuth, each spreadsheet is in the user's Drive under their quota.

**Previous approach**: The project previously used a service account. It was replaced with per-user OAuth. References to `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_SHEETS_SPREADSHEET_ID` in old documentation are obsolete — they were removed in the July 2026 documentation audit.

---

## ADR-010: In-process sheet lock (not distributed)

**Decision**: `sheet-store.ts` uses a `Map<string, Promise>` to serialize mutating operations per spreadsheet+sheet tab within a single process.

**Why**: Google Sheets has no transaction support. Concurrent writes (two simultaneous requests: create note + delete note) can interleave reads and writes, corrupting row state. An in-process queue prevents this within a single server instance.

**Limitation**: This lock only works with a single API server instance. Vercel serverless functions are single-instance per invocation, so the lock works on Vercel. Horizontal scaling (multiple always-on instances) would require a shared lock (e.g., Postgres advisory lock keyed by `spreadsheetId:sheetName`).
