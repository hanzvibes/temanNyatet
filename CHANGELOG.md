# Changelog

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
