# Changelog

## Documentation Audit & Synchronization — 2026-07-26

### Added
- **`AI_CONTEXT.md`** — AI-agent-optimized project summary: stack, folder overview, entry points, coding conventions, constraints, known debt, common mistakes. First file an AI should read.
- **`ARCHITECTURE.md`** — full system architecture: monorepo structure, frontend routing (CachedSwitch), data hooks pattern, API server middleware stack, Google OAuth flow, deployment topology, dependency relationships.
- **`DATABASE.md`** — complete schema reference: `profiles` table columns, migration history (with ordering notes for the three `002_*` files), Google Sheets tab schemas (Notes, Transactions, Todos, Links, \_Archive), type coercion rules, Supabase Storage.
- **`API.md`** — full API route reference: every endpoint with auth requirements, request/response shapes, error codes.
- **`AUTH.md`** — authentication and authorization reference: Supabase auth flow, Google OAuth 2.0 flow, subscription authorization, cron auth, Supabase configuration checklist, Google Cloud Console checklist.
- **`ENVIRONMENT.md`** — complete environment variable reference: frontend + API server, required vs optional, Replit secrets, Vercel quick reference, derivation logic for `GOOGLE_REDIRECT_URI` and `FRONTEND_URL`.
- **`DEPLOYMENT.md`** — deployment runbook: two-project Vercel setup, post-deploy steps, Supabase + Google Console + Mayar configuration, cron scheduler setup, secret rotation, end-to-end verification checklist.
- **`PRD.md`** — product requirements document: target user, business model, core module specs (Catatan, Keuangan, Todo, Link Saver), user flows, non-functional requirements, out-of-scope items.
- **`DECISIONS.md`** — 10 architecture decision records (ADRs) with why, tradeoffs, and future direction. Covers Google Sheets as data backend, Supabase for auth, CachedSwitch, custom data hooks, React+Vite over Next.js, Mayar payments, two Vercel projects, email confirmation, per-user OAuth, and in-process sheet lock.
- **`SECURITY.md`** — security controls: auth, OAuth, API server (Helmet, CORS, rate limiting, HMAC webhook, formula injection guard), data isolation, transport, known limitations, incident response.
- **`TROUBLESHOOTING.md`** — common problems and solutions: auth loops, RLS recursion, OAuth errors (`redirect_uri_mismatch`, `GOOGLE_TOKEN_INVALID`, `SPREADSHEET_NOT_FOUND`), subscription/payment issues, data not loading, PWA issues, development environment issues.
- **`ROADMAP.md`** — completed, in-progress, planned, and future ideas sections built from actual implementation.
- **`TASKS.md`** — 12 actionable tasks categorized by priority (Critical → Low): cron scheduler, OAuth publish, RLS migration, `002_*` collision, data hook migration, `lib/db/` resolution, OpenAPI audit, keyboard accessibility, delete confirmation.
- **`UI_UX_GUIDELINES.md`** — design system reference: color tokens, typography classes, component conventions (`PageEmpty`, drawers, modals, buttons), accessibility requirements, layout patterns, animation guidelines, dark mode, Indonesian copy guidelines.
- **`TESTING.md`** — current test state (none), manual testing checklist for all flows, prioritized automation roadmap (API unit tests first), recommended test stack.

### Updated
- **`DOC_AUDIT_REPORT.md`** — updated to reflect this audit wave: new files created, findings, remaining debt.
- **`README.md`** — added "Documentation" section with links to all new docs.

### Removed
- None (no files removed; `DOC_AUDIT_REPORT.md` and `CHANGELOG.md` retained and updated).

### Findings
- `lib/db/` is unused dead code (Drizzle scaffold, empty schema)
- Three migration files share `002_*` prefix (ordering ambiguity)
- `fix_profiles_rls_recursion.sql` is ad-hoc and not in the numbered sequence
- `lib/api-client-react` Orval-generated client only used for token wiring in `main.tsx`
- No automated tests exist
- Long-press delete (Keuangan, LinkSaver) has no keyboard alternative (WCAG gap)
- No external cron scheduler configured for `/api/cron/archive-expired`

---

## Production Deploy to Vercel + OAuth Wiring — 2026-07-26

### Added
- **`artifacts/api-server/docs/DEPLOY.md`** — fresh deploy doc khusus Vercel production. Mencakup:
  - Canonical production OAuth callback URL: `https://teman-nyatet-api-server.vercel.app/api/auth/google/callback` (pinned, no longer placeholder)
  - Google Cloud Console setup wizard (Authorized redirect URIs, JS origins, consent screen, scopes `drive.file` + `userinfo.email`)
  - Vercel env-var contract (setiap key wajib + sources: Supabase, Mayar, Google, cron)
  - End-to-end verification checklist (healthz, login, OAuth round-trip, Mayar webhook)
  - Adding new environment (preview/staging) dengan wildcards caveat
  - Rotating `GOOGLE_OAUTH_STATE_SECRET` / `GOOGLE_CLIENT_*` safely
- **Production domains table** di `README.md` (section "Deploy ke Vercel") — frontend `teman-nyatet.vercel.app`, API `teman-nyatet-api-server.vercel.app`. Replaces placeholder domain `temannyatet.id` di onboarding instructions
- Vercel-required env vars baru: `FRONTEND_URL`, `ALLOWED_ORIGINS`, `GOOGLE_REDIRECT_URI` untuk api-server project (ditambah ke `README.md` dan `artifacts/api-server/.env.example`)

### Updated
- **`README.md` "Deploy ke Vercel"** — melebar dari "two projects pattern" menjadi runbook penuh: Root Directory, framework auto-detect, env vars per project, Mayar webhook update, cron notes. Ditambah Vercel Production domains table
- **`replit.md` "Replit setup notes"** — fix misleading line "Originally deployed to Vercel — `vercel.json` files remain but are ignored". Production IS Vercel now; Replit adalah dev/staging
- **`artifacts/api-server/.env.example`** — annotated production override untuk `GOOGLE_REDIRECT_URI` (mencantumkan `https://teman-nyatet-api-server.vercel.app/api/auth/google/callback` di comment), dengan pointer ke `artifacts/api-server/docs/DEPLOY.md`

### Fixed
- **`AuthGuard` active-user 404 dead-end** di `artifacts/teman-nyatet/src/App.tsx`: jalur active hanya redirect kalau path masuk `hardcoded allowlist`. Setiap path tak-terdaftar mengirim user ke `NotFound` meskipun dia authenticated. Diperbaiki dengan route entries table; unmatched path di-redirect ke `/catatan` instead
- **`src/pages/not-found.tsx`**: tambah "Kembali ke Catatan" button (calls `useLocation().setLocation('/catatan')`), replace hardcoded `bg-gray-50`/`text-gray-*` dengan tokens tema (`bg-background`/`text-foreground`/`text-muted-foreground`) supaya tetap kontras di dark mode
- **`tsconfig.esModuleInterop`** di `artifacts/api-server/tsconfig.json` (commit `dda7a61`) — menambah flag `esModuleInterop: true` dan `allowSyntheticDefaultImports: true` agar Vercel post-build tsc test pass pada CJS packages (helmet, express-rate-limit, pino-http)

### Deprecated
- `Notes`, `transactions`, `todos`, `links` Supabase tables tetap di-dropsequence (pada 005 phase1) — app data lives di Google Sheets, dokumentasi ini tidak mengubah apa-apa tapi mencatat untuk konsistensi

### Reference
- See `artifacts/api-server/docs/DEPLOY.md` untuk full Vercel deployment + Google OAuth setup guide
- See `DOC_AUDIT_REPORT.md` (updated) untuk audit trail dari perubahan dokumentasi ini

---

## UI Polish and Instant Navigation — 2026-07-24

### Added
- **CachedSwitch** in `artifacts/teman-nyatet/src/App.tsx` — every visited page stays mounted in the DOM, toggled via the `hidden` attribute, so React Query's hooks + cache survive navigation. Returning to a previous tab paints instantly from in-memory data; fresh data revalidates silently in the background.
- **RouteSlot** wrapper (`src/App.tsx`) — one `<div hidden aria-hidden><Suspense fallback>` per route, preserving the lazy chunk's resolved promise state across visits.
- **`ROUTE_ENTRIES`** table in `src/App.tsx` — declarative list of paths/components; add a new page in one line.
- New CSS tokens in `artifacts/teman-nyatet/src/index.css`:
  - `--note-card-1..4` — the four sticky-note tints with light pastels in `:root` and flat dark tints (e.g. `#1F2D1A`, `#38201E`) under `.dark`, so cards keep their hue identity without popping bright on the slate canvas.
  - `--bottom-nav-collapsed-h: 96px` — documents `BottomSheetNav`'s `HANDLE_H(28) + NAV_H(68)` collapsed height so any other fixed chrome can clear it with a single `calc()`.
- **Shared overlay-bus** — `window` event `teman-nyatet:any-overlay` dispatched by `BottomSheetNav` on snap changes and by `SettingsSheet` on `[open]` transitions (`vaul` drives `open` through `onOpenChange`, so every close path is captured). Any future Drawer/Dialog can opt in with one short effect.
- Scroll-to-top on navigation (`src/App.tsx`) — every page shares one document scroll position; resetting on each `useLocation()` change keeps long Catatan listings from leaving Keuangan half-scrolled.

### Updated
- **TanStack Query defaults** in `src/App.tsx`: `staleTime: 30_000` (freshness window matches CachedSwitch's no-refetch contract), `gcTime: 30 min`, `refetchOnWindowFocus: 'always'`, `retry: 1`.
- `SortableNoteGrid.PALETTE` (`src/components/SortableNoteGrid.tsx`) — references `var(--note-card-1..4)` instead of hardcoded hex pastels; the cascade flips light/dark without touching JS.
- `NoteCardBody` (`src/components/SortableNoteGrid.tsx`) — title/content use `dark:text-foreground` (`/90` for body), tag pills `dark:bg-white/10 dark:text-foreground`, date `dark:text-muted-foreground`.
- `SearchBar` and `PwaInstallPrompt` (`src/components/SearchBar.tsx`, `src/components/PwaInstallPrompt.tsx`) — `bg-white` → `dark:bg-card`; keyboard-only focus rings via `focus-visible:` instead of `focus:`.
- `PwaInstallPrompt` position — `bottom-[calc(1.25rem+var(--bottom-nav-collapsed-h)+0.75rem)]` (128 px above the viewport bottom, 12 px clear of the nav top); `z-[60]` so it stays above `BottomSheetNav`'s `z-50` when the sheet expands.

### Fixed
- Sticky-note palette no longer renders as flashlight-bright pastels on the dark canvas — the `--note-card-1..4` dark variants sit one brightness step above the surrounding card, preserving hue without dominating the page.
- PWA install banner no longer overlaps any drawer — `BottomSheetNav` snaps and the `SettingsSheet` Drawer (`vaul`) both dispatch `teman-nyatet:any-overlay`; the prompt hides for the lifetime of any open snapshot and reappears when every overlay closes.
- `PwaInstallPrompt`'s Install/Tutup buttons now show a keyboard-visible focus ring on `Tab`/`Enter` navigation (was `focus:`, which painted on click only).

### Removed
- `AnimatePresence`, `motion`, `<Switch>`, `<Route>` from `src/App.tsx` — CachedSwitch delivers the instant tab swap the fade was masking; instant render is the goal.
- `wouter`'s `Switch` / `Route` imports from `src/App.tsx` — unused after the CachedSwitch rewrite.

---

## Documentation Update — 2026-07-23

### Added
- Added `CHANGELOG.md` to track documentation and project changes.
- Added Google OAuth setup instructions to `supabase/migrations/README.md`.
- Added `VITE_API_SERVER_URL`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, and `GOOGLE_OAUTH_*` env vars to documentation and `.env.example` files.
- Added legacy table notice to `supabase/migrations/README.md`: `notes`, `transactions`, `todos`, and `links` are created by `001_initial_schema.sql` and dropped by `005_phase1_schema.sql`; live data lives in Google Sheets.
- Added `fix_profiles_rls_recursion.sql` reference to `supabase/migrations/README.md` and `replit.md`.
- Added API route references (`/subscription/status`, `/profile/avatar`, `/spreadsheet/*`, `/healthz`) to `README.md`.

### Updated
- Rewrote `README.md` architecture section to reflect the current per-user Google OAuth + Google Sheets data backend.
- Updated `README.md` stack to include React 19, Vite 7, Tailwind CSS 4, TanStack Query, React Hook Form, Zod, and Express 5.
- Updated `README.md` environment variable sections to include Google OAuth secrets and remove obsolete `GOOGLE_SERVICE_ACCOUNT_KEY` / `GOOGLE_SHEETS_SPREADSHEET_ID` references.
- Updated `README.md` Vercel deployment instructions to include `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_STATE_SECRET` for the API server.
- Updated `replit.md` migration order to list all migration files, including the three `002_*` files and the RLS fix script.
- Updated `replit.md` to mark `MAYAR_WEBHOOK_SECRET` and `VITE_MAYAR_PAYMENT_URL` as optional rather than configured.
- Updated `supabase/migrations/README.md` migration order to include all current migration files.
- Updated `artifacts/api-server/.env.example` to include `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, and `ALLOWED_ORIGINS`.
- Updated `artifacts/teman-nyatet/.env.example` to include `VITE_MAYAR_PAYMENT_URL` and `VITE_API_SERVER_URL`.

### Fixed
- Corrected `README.md` claim that data CRUD goes through Supabase directly; it now documents that data goes through the API server to Google Sheets.
- Removed references in `README.md` and `supabase/migrations/README.md` to `notes`, `transactions`, `todos`, and `links` as live data tables.
- Fixed pnpm version reference in `README.md` to match `package.json` (`pnpm@10.26.1`).
- Removed obsolete `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_SHEETS_SPREADSHEET_ID` from `artifacts/api-server/.env.example`; the project uses per-user OAuth, not service accounts.

### Removed
- Removed the "User preferences" placeholder content from `README.md` and `replit.md` (still present as a placeholder).
- Removed outdated deployment env var lists that omitted Google OAuth credentials.

### Deprecated
- `lib/db/` Drizzle scaffolding is currently unused; migrations are run manually via Supabase SQL Editor.
- Legacy `notes`, `transactions`, `todos`, `links` Supabase tables are created by `001_initial_schema.sql` and dropped by `005_phase1_schema.sql`.

### Known Limitations
- Multiple migration files share the `002_*` prefix, which may cause filename-order ambiguity in some environments. Run them manually in the order documented in `supabase/migrations/README.md`.
- `fix_profiles_rls_recursion.sql` is an ad-hoc fix, not a numbered migration, and must be applied manually if the RLS recursion error occurs.
- The generated Orval client (`lib/api-client-react`) is only used for token wiring in `main.tsx`; the four data hooks use the custom `apiClient.ts` client.
- `lib/db/` is not used for schema management; the source of truth for the live schema is the SQL files in `supabase/migrations/`.
