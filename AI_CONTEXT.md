# AI_CONTEXT.md — TemanNyatet

> Optimized for AI coding agents. Read this file first, then follow the "Read next" pointers.

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](./README.md) |
| ARCHITECTURE — system architecture & data flow | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| API — complete route reference | [`API.md`](./API.md) |
| AUTH — Supabase + Google OAuth flows | [`AUTH.md`](./AUTH.md) |
| DATABASE — Supabase schema + Google Sheets schemas | [`DATABASE.md`](./DATABASE.md) |
| ENVIRONMENT — env vars & secrets | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| replit.md — Replit-specific instructions | [`replit.md`](./replit.md) |

---

## Project summary

TemanNyatet is a SaaS note-taking PWA for Indonesian users. It has four core modules: **Catatan** (notes), **Keuangan** (finance tracker), **To-Do List**, and **Link Saver**. Mobile-first with bottom sheet navigation. Paid via Mayar (Indonesian payment gateway), Rp100.000/month or Rp249.000/year.

## Business goal

Give Indonesian users a private, mobile-first productivity app where their data lives in their own Google Drive — not on a shared server. The app is a SaaS subscription with a freemium-style gate: users sign up free, must pay to access features.

## Current implementation status (as of July 2026)

- All four feature modules: fully implemented and live
- Auth flow: complete (Supabase email/password + email confirmation)
- Google OAuth + Sheets data backend: complete (per-user spreadsheet, auto-created on first connect)
- Subscription gate (Mayar webhook): complete
- PWA: complete (VitePWA, service worker, install prompt)
- Deployment: live on Vercel (frontend: `teman-nyatet.vercel.app`, API: `teman-nyatet-api-server.vercel.app`)
- Dark mode: implemented via Tailwind `.dark` class
- Desktop layout: sidebar nav on lg+, bottom sheet nav on mobile

## Technology stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS 4, shadcn/ui (Radix UI) |
| Routing | wouter + custom CachedSwitch (keeps pages mounted in DOM) |
| State / data | TanStack Query (server state), React Context (auth, createIntent) |
| UI extras | Vaul (bottom sheets/drawers), Framer Motion, dnd-kit, Recharts, date-fns, lucide-react, sonner |
| Forms | React Hook Form + Zod |
| Backend | Express 5, TypeScript, Pino (logging), Helmet, CORS, express-rate-limit |
| Auth | Supabase Auth (email/password, email confirmation required) |
| App data | Google Sheets API — per-user spreadsheet in their own Drive |
| Profile/sub | Supabase Postgres (`profiles` table) |
| Payments | Mayar (HMAC-SHA256 webhook) |
| PWA | vite-plugin-pwa (workbox) |
| Monorepo | pnpm workspaces |
| Deployment | Vercel (two separate projects from one repo) |

## Folder overview

```
/
├── artifacts/
│   ├── teman-nyatet/          # React + Vite frontend SPA
│   │   └── src/
│   │       ├── App.tsx        # Router (CachedSwitch), AuthGuard, MainLayout
│   │       ├── main.tsx       # Entry: theme init, Supabase token wiring, SW registration
│   │       ├── contexts/      # AuthContext, CreateContext
│   │       ├── hooks/         # useNotes, useTransactions, useTodos, useLinks
│   │       ├── pages/         # One file per route
│   │       ├── components/    # BottomSheetNav, SidebarNav, DraggableSheet, PageStates, ui/
│   │       └── lib/           # apiClient.ts, supabase.ts, database.types.ts
│   └── api-server/            # Express 5 API server
│       └── src/
│           ├── index.ts       # Entry: env check + app.listen()
│           ├── app.ts         # Express app setup (middleware, routes)
│           ├── routes/        # One file per route group
│           ├── middleware/     # requireAuth.ts (Supabase JWT + rate limit)
│           └── lib/           # google-oauth.ts, user-sheet.ts, sheet-store.ts
├── lib/
│   ├── api-spec/              # openapi.yaml + Orval config (partially used — see debt)
│   ├── api-client-react/      # Orval-generated TanStack Query hooks (token wiring only)
│   ├── api-zod/               # Zod schemas generated from OpenAPI spec
│   └── db/                    # Drizzle ORM scaffolding — UNUSED, empty schema
├── supabase/migrations/       # SQL run manually in Supabase SQL Editor
└── scripts/post-merge.sh      # Post-merge hook for Replit task agents
```

## Important entry points

| File | Purpose |
|---|---|
| `artifacts/teman-nyatet/src/App.tsx` | Router, AuthGuard, route table (ROUTE_ENTRIES) |
| `artifacts/teman-nyatet/src/main.tsx` | App bootstrap, theme, Supabase token wiring |
| `artifacts/teman-nyatet/src/contexts/AuthContext.tsx` | Auth state, profile loading, email verification guard |
| `artifacts/teman-nyatet/src/lib/apiClient.ts` | Fetch wrapper → api-server (Bearer token, 401 retry) |
| `artifacts/api-server/src/app.ts` | Express middleware stack, routes mounting |
| `artifacts/api-server/src/index.ts` | Required env check, server start |
| `artifacts/api-server/src/middleware/requireAuth.ts` | JWT verify + Google Sheets client attachment |
| `artifacts/api-server/src/lib/sheet-store.ts` | Google Sheets CRUD (the "database") |
| `artifacts/api-server/src/lib/google-oauth.ts` | OAuth2 flow, HMAC state, token management |

## Architecture summary

```
Browser
  ↓ Supabase JWT (Bearer)
Frontend (Vite SPA)
  ↓ /api/* (Vite proxy in dev, direct URL in prod)
API Server (Express 5)
  ├── Supabase Admin SDK  →  verify JWT, read/write profiles
  └── Google Sheets API  →  CRUD on user's private spreadsheet
```

- **Data storage**: App data (notes, transactions, todos, links) lives in 4 tabs of each user's own Google Spreadsheet. Supabase only stores the `profiles` row (subscription, tokens, spreadsheet ID).
- **Auth guard flow**: unauthenticated → `/login`; no spreadsheet → `/connect-sheet`; `pending` → `/payment`; `archived` → `/archived`; `active` → feature pages.
- **Navigation**: CachedSwitch keeps all visited pages mounted (DOM `hidden` toggle), React Query cache stays alive. Bottom sheet nav on mobile, sidebar on desktop (lg+).
- **Polling**: Data hooks poll every 15 s. TanStack Query `staleTime: 30 s`, `gcTime: 30 min`.

## Coding conventions discovered

- **No `TanStack Query` `useQuery`** in data hooks — they use module-level Map caches + polling via `useEffect`. Only `QueryClient` defaults and `queryClient.invalidateQueries` are used for cache busting.
- **shadcn/ui** component imports from `@/components/ui/*`, aliased to `src/`. Never add raw Radix UI imports when a shadcn wrapper exists.
- **Tailwind 4** — uses `@theme` tokens in `index.css`, not `tailwind.config`. Tokens: `--primary`, `--finance` (yellow), `--todo` (blue), `--linksaver` (red/pink).
- **Section accent colors**: Keuangan uses `#F4C753`, Todo uses `#9CB4D4`/`text-todo`, LinkSaver uses `#E09898`/`text-linksaver`. These are inline hex where Tailwind 4 arbitrary-value utilities can't reliably apply opacity modifiers.
- **`PageEmpty`** in `src/components/PageStates.tsx` accepts `cta?: React.ReactNode`. Pass a `<button>` there for empty state CTAs — do not inline the empty state.
- **Drawer pattern**: Feature forms use `<Drawer.Root open={...}>` from vaul. State variable: `isFormOpen`. Handler: `handleOpenForm()` or similar.
- **`CreateContext`**: `pendingCreate` string triggers form open from the bottom sheet's "+" button. Pages listen in a `useEffect` and clear with `clearCreate()`.
- **Toast**: sonner via `import { toast } from 'sonner'`.
- **Form validation**: always React Hook Form + Zod. Schema defined at module top.
- **`pnpm` only** — `npm` and `yarn` are rejected by the preinstall hook.

## Important constraints

1. **Google Sheets has no transactions** — `sheet-store.ts` uses an in-process `Map` lock per spreadsheet+sheet. This lock doesn't survive horizontal scaling.
2. **Email confirmation required** — `AuthContext` signs out users whose email is not confirmed. Supabase must have "Confirm email" enabled.
3. **`005_phase1_schema.sql` drops legacy tables** — `notes`, `transactions`, `todos`, `links` Supabase tables are dropped. Never write app data to Supabase; use the API server.
4. **`GOOGLE_REDIRECT_URI` must be byte-exact** — must match Google Cloud Console and Vercel env var exactly. Any mismatch → `redirect_uri_mismatch` OAuth error.
5. **Vercel Cron is GET only** — `POST /api/cron/archive-expired` requires an external scheduler (GitHub Actions, cron-job.org), not Vercel Cron.
6. **pnpm version pinned** at `10.26.1` in root `package.json`. Do not upgrade to pnpm 11 without migrating `onlyBuiltDependencies` → `allowBuilds`.

## Known technical debt

| Item | Impact | File |
|---|---|---|
| `lib/db/` is unused | Dead scaffolding, empty Drizzle schema | `lib/db/src/schema/index.ts` |
| `lib/api-client-react` generated client only used for token wiring | Orval pipeline maintained for one use | `artifacts/teman-nyatet/src/main.tsx` |
| Three migration files share `002_*` prefix | Filename-order ambiguity | `supabase/migrations/` |
| `fix_profiles_rls_recursion.sql` is ad-hoc | Not in numbered sequence | `supabase/migrations/` |
| In-process sheet lock | Won't work horizontally scaled | `artifacts/api-server/src/lib/sheet-store.ts` |
| Data hooks use module-level Map cache + polling | Custom caching layer parallel to TanStack Query | `artifacts/teman-nyatet/src/hooks/` |

## Current priorities (July 2026)

1. UX improvements to the four feature pages (empty states, form UX, mobile polish)
2. Documentation accuracy (this audit)

## Files AI should read first

1. `AI_CONTEXT.md` (this file)
2. `artifacts/teman-nyatet/src/App.tsx` — routing, auth guard, layout
3. `artifacts/api-server/src/middleware/requireAuth.ts` — auth middleware
4. `artifacts/api-server/src/lib/sheet-store.ts` — data layer
5. `artifacts/teman-nyatet/src/components/PageStates.tsx` — shared empty/loading states
6. `ARCHITECTURE.md` — full architecture reference
7. `API.md` — complete API route reference
8. `DATABASE.md` — schema reference

## Common mistakes to avoid

- **Do not write data to Supabase tables** (notes, transactions, todos, links) — they are dropped. All data goes through the API server to Google Sheets.
- **Do not use `fetch` directly in pages** — use `apiClient.ts` which handles auth tokens and 401 retry.
- **Do not use `useQuery` from TanStack Query** for the four data modules — use the existing hooks (`useNotes`, `useTransactions`, etc.) which have their own cache.
- **Do not add `VITE_` prefix to API server env vars** — frontend uses `VITE_SUPABASE_*`, API server uses `SUPABASE_*`.
- **Do not use `Switch`/`Route` from wouter** — routing uses the custom `CachedSwitch` (DOM `hidden` toggle) defined in `App.tsx`.
- **Do not create new page files without adding them to `ROUTE_ENTRIES`** in `App.tsx`.
- **Do not hardcode `localhost`** in app code — use relative URLs (`/api/...`) and let the Vite proxy handle dev routing.
