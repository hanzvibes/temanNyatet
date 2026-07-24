# Changelog

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
