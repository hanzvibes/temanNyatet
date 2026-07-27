# ARCHITECTURE.md — TemanNyatet

> See also: [`AI_CONTEXT.md`](./AI_CONTEXT.md) (quick reference), [`DATABASE.md`](./DATABASE.md) (schema), [`API.md`](./API.md) (routes), [`AUTH.md`](./AUTH.md) (auth flow).

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| AI_CONTEXT — quick reference for AI agents | [`AI_CONTEXT.md`](./AI_CONTEXT.md) |
| API — complete route reference | [`API.md`](./API.md) |
| DATABASE — Supabase schema + Google Sheets schemas | [`DATABASE.md`](./DATABASE.md) |
| AUTH — Supabase + Google OAuth flows | [`AUTH.md`](./AUTH.md) |
| DEPLOYMENT — Vercel deployment runbook | [`DEPLOYMENT.md`](./DEPLOYMENT.md) |
| DECISIONS — architecture decision records | [`DECISIONS.md`](./DECISIONS.md) |

---

## System overview

```
┌─────────────────────────────────────────────────────┐
│                    User's Browser                    │
│  React 19 + Vite SPA (PWA)                          │
│  artifacts/teman-nyatet/                            │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS  Bearer: <supabase-jwt>
                     │ /api/* (Vite proxy in dev)
┌────────────────────▼────────────────────────────────┐
│              API Server (Express 5)                  │
│  artifacts/api-server/                              │
│                                                     │
│  ┌─────────────┐    ┌──────────────────────────┐   │
│  │ requireAuth  │    │      sheet-store.ts       │   │
│  │ middleware   │    │  (CRUD → Google Sheets)   │   │
│  │ - verify JWT │    └──────────────┬───────────┘   │
│  │ - rate limit │                   │               │
│  │ - attach     │    ┌──────────────▼───────────┐   │
│  │   sheetsClient│   │   Google Sheets API v4    │   │
│  └─────────────┘    └──────────────────────────┘   │
└──────────┬──────────────────────────────────────────┘
           │ supabase-js (service role)
┌──────────▼──────────┐      ┌──────────────────────┐
│   Supabase Postgres  │      │   Google Drive API    │
│   `profiles` table   │      │   (spreadsheet CRUD)  │
│   - auth tokens      │      │   Per-user private    │
│   - subscription     │      │   spreadsheet         │
│   - spreadsheet_id   │      └──────────────────────┘
└─────────────────────┘
```

---

## Monorepo structure

```
/ (pnpm workspace root)
├── artifacts/
│   ├── teman-nyatet/      @workspace/teman-nyatet — frontend SPA
│   └── api-server/        @workspace/api-server   — Express API
├── lib/
│   ├── api-spec/          @workspace/api-spec      — OpenAPI spec + Orval codegen
│   ├── api-client-react/  @workspace/api-client-react — generated TanStack hooks (token wiring only)
│   ├── api-zod/           @workspace/api-zod       — generated Zod schemas
│   └── db/                @workspace/db            — Drizzle ORM scaffold (UNUSED)
├── supabase/migrations/   — SQL files run manually in Supabase SQL Editor
└── scripts/post-merge.sh  — post-merge hook for Replit task agents
```

The `pnpm-workspace.yaml` lists all packages. Each package has its own `package.json`, `tsconfig.json`, and build pipeline.

---

## Frontend architecture (`artifacts/teman-nyatet/`)

### Routing — CachedSwitch

`App.tsx` uses a custom router instead of wouter's built-in `<Switch>`. Every visited page stays mounted in the DOM via the `hidden` attribute; only the active page is visible. This means:

- React Query hook caches survive navigation — instant back-tab renders from memory
- Lazy-loaded chunks aren't re-evaluated on every tab switch
- `refetchOnWindowFocus: 'always'` silently refreshes stale data in background

Route table lives in `ROUTE_ENTRIES` in `App.tsx`. Adding a new page = one line.

```
ROUTE_ENTRIES paths:
  /login          → AuthPage
  /auth/confirm   → AuthConfirmPage   ← email OTP verification landing page
  /payment        → PaymentPage
  /archived       → ArchivedPage
  /connect-sheet  → ConnectSheetPage
  /catatan        → CatatanPage
  /keuangan       → KeuanganPage
  /todo           → TodoPage
  /linksaver      → LinkSaverPage
  (unmatched)     → NotFound
```

### Auth guard flow

```
Loading?           → spinner
No user            → /login (public routes /login and /auth/confirm pass through)
Has user, no profile.spreadsheet_id → /connect-sheet
profile.subscription_status === 'pending'  → /payment
profile.subscription_status === 'archived' → /archived
profile.subscription_status === 'active'   → feature pages
  └─ if on /login, /payment, /archived     → /catatan
```

Public routes (no auth required): `/login`, `/auth/confirm`

`/auth/confirm` is the email OTP verification landing page. Supabase emails link to
`<SITE_URL>/auth/confirm?token_hash=<hash>&type=email`. The page calls
`supabase.auth.verifyOtp({ token_hash, type })` then redirects to `/login` on success.

Spreadsheet access errors from data hooks dispatch `teman-nyatet:spreadsheet-error` window event → redirect to `/connect-sheet?error=<code>`.

### Layout

| Context | Component | Condition |
|---|---|---|
| Unauthenticated / onboarding | `max-w-md mx-auto` centered card | `!showNav` (no user or not active) |
| Authenticated + active | `SidebarNav` (lg+) + `BottomSheetNav` (mobile) | `showNav` |

### Data hooks

The four data modules (`useNotes`, `useTransactions`, `useTodos`, `useLinks`) share a pattern:

- Module-level `Map` cache keyed by `userId` — data persists across route unmounts
- Polling every 15 s via `useInterval` or `useEffect`
- Mutation functions return Promises, optimistically update local state, then revalidate
- Errors surface via sonner toasts

These hooks do **not** use `useQuery` — they predate TanStack Query adoption in this codebase. `QueryClient` is present for `staleTime`/`gcTime` defaults and invalidation only.

### Contexts

| Context | Purpose |
|---|---|
| `AuthContext` | Supabase session, profile row, email verification gate |
| `CreateContext` | Global `pendingCreate` string triggers form open from BottomSheetNav |

### PWA

- `vite-plugin-pwa` generates service worker via workbox
- `registerType: 'prompt'` — manual registration in `main.tsx` via `requestIdleCallback`
- `manifest.json` maintained manually in `public/`
- Precaches all built assets; network-first for HTML, cache-first for fonts
- Never caches `/api/*` routes
- Install prompt: `PwaInstallPrompt` component, positioned above bottom nav, hidden during any open overlay

### Overlay bus

`BottomSheetNav` and `SettingsSheet` dispatch `window` event `teman-nyatet:any-overlay` on snap/open changes. `PwaInstallPrompt` listens and hides during any open overlay. New overlays opt in with a single `useEffect`.

---

## API server architecture (`artifacts/api-server/`)

### Entry point split

```
src/index.ts   — required env check, calls app.listen() (gated on Vercel detection)
src/app.ts     — Express app: middleware stack, route mounting
```

`src/index.ts` exports `default app` so `@vercel/node` can wrap it serverlessly. `app.listen()` is guarded by `process.env.VERCEL !== '1'`.

### Middleware stack (in order)

```
1. Helmet            (security headers)
2. CORS              (origins from ALLOWED_ORIGINS env or allow-all)
3. express-rate-limit (300 req / 15 min per IP, global)
4. pino-http         (structured request logging)
5. express.raw()     (for /api/mayar-webhook only — raw body for HMAC)
6. express.json()    (256kb limit)
7. express.urlencoded()
```

### Authentication middleware (`requireAuth.ts`)

Two levels:

| Middleware | What it does |
|---|---|
| `requireUser` | Verifies Supabase JWT, confirms email, attaches `req.userId` |
| `requireAuth` | Calls `requireUser` + resolves `spreadsheetId` + builds `sheetsClient`, returns `428 GOOGLE_NOT_CONNECTED` if missing |
| `userRateLimit` | Per-user 120 req/min (in-memory, `express-rate-limit`) |

### Data layer — `sheet-store.ts`

All app data lives in Google Sheets. `sheet-store.ts` provides:

- `ensureSheetsInitialized()` — creates missing tabs, writes/repairs headers; cached per spreadsheet per process lifetime
- `listByUser()` — reads all rows for a user from a named sheet tab
- `createRow()` — appends a row with a new UUID
- `updateRow()` — reads all rows, updates the matching one, writes back
- `deleteRow()` — soft-deletes to `_Archive` tab, then removes from data tab
- `reorderRows()` — updates `position` column for Notes drag-and-drop
- `repairHeaders()` — force-re-initializes headers (used by spreadsheet repair route)
- `withSheetLock()` — per-spreadsheet+sheet in-process queue lock (no transaction support)

Sheet tab names are emoji-prefixed: `📝 Notes`, `💰 Transactions`, `✅ Todos`, `🔗 Links`, `📦 _Archive`.

### Google OAuth flow

```
1. GET /api/auth/google/initiate
   → generates OAuth URL with HMAC-signed state (CSRF protection)
   → returns { url } to frontend

2. Browser → Google consent screen

3. GET /api/auth/google/callback?code=...&state=...
   → verifies HMAC state
   → exchanges code for tokens
   → creates spreadsheet in user's Drive (Drive API)
   → calls ensureSheetsInitialized() on new spreadsheet
   → saves spreadsheet_id + google_refresh_token to profiles
   → redirects to FRONTEND_URL (or REPLIT_DEV_DOMAIN fallback)

4. GET /api/auth/google/status
   → returns connection status from profiles

5. DELETE /api/auth/google/disconnect
   → revokes Google token
   → clears spreadsheet_id + google_refresh_token from profiles
```

---

## Deployment architecture

Two Vercel projects from the same GitHub repo:

| Project | Root Directory | Runtime |
|---|---|---|
| `teman-nyatet` | `artifacts/teman-nyatet` | Vite SPA, output `dist/public`, SPA rewrite |
| `teman-nyatet-api-server` | `artifacts/api-server` | `@vercel/node` serverless function |

Production URLs (as of July 2026):
- Frontend: `https://teman-nyatet.vercel.app`
- API: `https://teman-nyatet-api-server.vercel.app`

Replit is used for development only. Workflows:
- `artifacts/teman-nyatet: web` → `pnpm --filter @workspace/teman-nyatet run dev` (port 5000)
- `artifacts/api-server: API Server` → `pnpm --filter @workspace/api-server run dev` (port 8080)

Vite dev server proxies `/api/*` → `localhost:8080` so frontend and API share an origin in dev.

---

## Dependency relationships

```
teman-nyatet
  └── @workspace/api-client-react  (token wiring in main.tsx only)
      └── @workspace/api-spec      (openapi.yaml, Orval source)
          └── @workspace/api-zod   (generated Zod schemas)

api-server
  └── (no internal lib dependencies; reads api-spec types directly if needed)

lib/db
  └── UNUSED — Drizzle ORM scaffold with empty schema/index.ts
```

---

## Key architectural decisions

See `DECISIONS.md` for the full rationale. Summary:

| Decision | Choice | Why |
|---|---|---|
| App data storage | Google Sheets (per user) | User owns their data; no server storage cost |
| Auth | Supabase | Managed auth, RLS, email confirmation built-in |
| Payment | Mayar | Indonesian-market payment gateway |
| Routing | CachedSwitch | Instant tab switches, no refetch on navigation |
| Deploy | Vercel (two projects) | Free tier, serverless Node, SPA rewrite |
| API client | Custom `apiClient.ts` | Predates TanStack Query adoption; handles 401 retry |
