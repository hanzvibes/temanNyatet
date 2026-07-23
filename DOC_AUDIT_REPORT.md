# Documentation Audit Report

**Date:** 2026-07-23  
**Auditor:** Replit Agent (Senior Software Architect, Technical Writer, Documentation Auditor)  
**Mode:** Strict — source code is the only source of truth.  
**Scope:** All project Markdown files plus environment example files and key configuration.  

---

## Files audited

- `README.md`
- `replit.md`
- `supabase/migrations/README.md`
- `.agents/memory/MEMORY.md`
- `.agents/memory/google-sheets-oauth-arch.md`
- `.agents/memory/supabase-profiles-missing-columns.md`
- `.agents/memory/gauth-version-conflict.md`
- `.agents/memory/google-sheets-as-db.md` (superseded but retained)
- `.agents/memory/google-sheets-template-architecture.md`
- `.agents/memory/secrets-pasted-in-chat.md`
- `TEMAN_NYATET_AUDIT_ROADMAP.md`
- `artifacts/api-server/.env.example`
- `artifacts/teman-nyatet/.env.example`
- `package.json`
- `pnpm-workspace.yaml`
- `artifacts/teman-nyatet/package.json`
- `artifacts/api-server/package.json`
- `artifacts/teman-nyatet/vercel.json`
- `artifacts/api-server/vercel.json`
- `artifacts/teman-nyatet/src/main.tsx`
- `artifacts/teman-nyatet/src/lib/database.types.ts`
- `artifacts/teman-nyatet/src/lib/apiClient.ts`
- `artifacts/teman-nyatet/src/lib/supabase.ts`
- `artifacts/teman-nyatet/src/hooks/useNotes.ts`
- `artifacts/teman-nyatet/src/hooks/useTransactions.ts`
- `artifacts/teman-nyatet/src/hooks/useTodos.ts`
- `artifacts/teman-nyatet/src/hooks/useLinks.ts`
- `artifacts/api-server/src/index.ts`
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/routes/index.ts`
- `artifacts/api-server/src/routes/auth-google.ts`
- `artifacts/api-server/src/routes/notes.ts`
- `artifacts/api-server/src/routes/transactions.ts`
- `artifacts/api-server/src/routes/todos.ts`
- `artifacts/api-server/src/routes/links.ts`
- `artifacts/api-server/src/routes/spreadsheet.ts`
- `artifacts/api-server/src/routes/profile.ts`
- `artifacts/api-server/src/routes/subscription.ts`
- `artifacts/api-server/src/routes/webhook.ts`
- `artifacts/api-server/src/routes/cron.ts`
- `artifacts/api-server/src/routes/health.ts`
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_add_profile_fields.sql`
- `supabase/migrations/002_add_avatar_url.sql`
- `supabase/migrations/002_add_spreadsheet_id.sql`
- `supabase/migrations/003_template_tracking.sql`
- `supabase/migrations/004_add_google_oauth.sql`
- `supabase/migrations/005_phase1_schema.sql`
- `supabase/migrations/fix_profiles_rls_recursion.sql`
- `lib/db/src/index.ts`
- `lib/db/src/schema/index.ts`
- `lib/db/drizzle.config.ts`
- `lib/db/package.json`
- `lib/api-spec/openapi.yaml` (partial review of structure)

Skill files under `.local/skills/` and `.agents/skills/` were not audited because they are platform/agent capabilities, not project documentation.

---

## Files modified

- `README.md` — major rewrite to match current architecture
- `replit.md` — corrected migration order, env var status, and stale domain references
- `supabase/migrations/README.md` — added all migrations, OAuth setup, legacy table notice, and RLS fix reference
- `artifacts/api-server/.env.example` — replaced service-account vars with Google OAuth vars; added optional overrides
- `artifacts/teman-nyatet/.env.example` — added `VITE_MAYAR_PAYMENT_URL` and `VITE_API_SERVER_URL`

## Files created

- `CHANGELOG.md` — initial documentation update entry
- `DOC_AUDIT_REPORT.md` — this report

## Files skipped

- `.local/skills/**` — Replit platform skill docs, not project documentation
- `.agents/skills/**` — agent capability docs, not project documentation
- `TEMAN_NYATET_AUDIT_ROADMAP.md` — left in place; it is a forward-looking backlog and its factual claims were not contradicted by the audit. A few roadmap items (e.g., migration consolidation) may overlap with this audit but are code changes, not documentation changes.

---

## Outdated sections removed

### README.md
- Removed: "Direct Supabase from frontend" architecture claim. The data hooks call the API server (`src/lib/apiClient.ts`), not Supabase directly.
- Removed: "State: React Context (auth) + useState/useEffect (feature data via Supabase directly)" stack line. Data is fetched via custom polling hooks from the API server.
- Removed: `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_SHEETS_SPREADSHEET_ID` from env vars; the code uses `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_STATE_SECRET` (verified in `src/index.ts` and `src/lib/google-oauth.ts`).
- Removed: pnpm `10.34.3` reference; `package.json` pins `10.26.1`.
- Removed: claim that `notes`, `transactions`, `todos`, `links` are live Supabase tables.

### replit.md
- Removed: stale Replit domain in the `GOOGLE_REDIRECT_URI` example (domains are dynamic; documentation now describes the derivation from `REPLIT_DEV_DOMAIN`).
- Removed: claim that `MAYAR_WEBHOOK_SECRET` and `VITE_MAYAR_PAYMENT_URL` are "configured" as required secrets. They are optional; the app or route fails closed if unset.

### supabase/migrations/README.md
- Removed: instruction to run only `001_initial_schema.sql` and `002_add_profile_fields.sql`. All migrations are required.
- Removed: table summary that treated `notes`, `transactions`, `todos`, `links` as live tables. Added legacy table notice.

### artifacts/api-server/.env.example
- Removed: `GOOGLE_SERVICE_ACCOUNT_KEY` and `GOOGLE_SHEETS_SPREADSHEET_ID` (no code references found; grep returned no output).

---

## Broken links / invalid references fixed

- `README.md` now references `replit.md` and `TEMAN_NYATET_AUDIT_ROADMAP.md` under Pointers.
- `supabase/migrations/README.md` now references `fix_profiles_rls_recursion.sql` for the RLS recursion error.
- All file paths in updated docs were verified to exist at the time of the audit.

---

## Missing documentation added

- `CHANGELOG.md` created with a documentation-update entry.
- Google OAuth setup steps added to `supabase/migrations/README.md`.
- `VITE_API_SERVER_URL` documented in `artifacts/teman-nyatet/.env.example` and `README.md`.
- `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, `SITE_URL`, and `LOG_LEVEL` documented in `artifacts/api-server/.env.example` and `README.md`.
- All current API routes documented in `README.md` (previously only webhook and cron were mentioned).
- Legacy table notice and per-user Google Sheets data backend documented in `supabase/migrations/README.md`.
- Migration order now includes all `002_*` files, `003`, `004`, `005`, and the ad-hoc RLS fix.

---

## Unverifiable items (explicitly marked)

- The exact current production domain(s) for TemanNyatet. `README.md` and `supabase/migrations/README.md` use `https://temannyatet.id` as a placeholder example because no production domain is present in the codebase.
- The exact Mayar payment page URL. `README.md` and `.env.example` use `https://mayar.id/your-payment-page` as a placeholder.
- Whether the `avatars` Supabase Storage bucket is created before the first upload. The code (`profile.ts`) attempts to create it on first upload; documentation reflects this behavior.
- Whether `lib/db/` will be used in the future. It is currently unused; documentation marks it as deprecated/unused.

---

## Remaining documentation debt

1. **Migration numbering**: Three files share the `002_*` prefix. This is a code-level issue, not strictly documentation, but it makes the documented order fragile. A future task should rename or consolidate these migrations.
2. **`fix_profiles_rls_recursion.sql` is ad-hoc**: It is not part of the numbered sequence. The documentation notes this, but ideally it should be promoted to a numbered migration.
3. **OpenAPI spec accuracy**: `lib/api-spec/openapi.yaml` was only partially reviewed. A full audit of the spec against the actual route implementations is still needed to ensure the generated client stays accurate.
4. **Generated client usage**: The Orval-generated client is only used for token wiring (`main.tsx`). The data hooks use a custom client. This duality is documented but could be simplified in the future.
5. **Drizzle scaffolding**: `lib/db/` is unused. A future task should either remove it or adopt it fully; the documentation currently marks it as unused.
6. **No `CONTRIBUTING.md`, `ARCHITECTURE.md`, `SECURITY.md`, or `DEPLOYMENT.md`**: These docs do not exist. This audit did not create them except where they overlapped with `README.md` updates, because the prompt asked to preserve style and only document what exists. A future task could create `DEPLOYMENT.md` from the Vercel section of `README.md`.
7. **TEMAN_NYATET_AUDIT_ROADMAP.md**: Contains forward-looking recommendations. Some items (e.g., migration consolidation, payment bypass fix) are code changes that should be tracked as tasks, not docs.

---

## Recommendations

1. **Promote `fix_profiles_rls_recursion.sql` to a numbered migration** and remove the conflicting policy refresh from `005_phase1_schema.sql` so new projects don't hit the recursion bug.
2. **Consolidate the three `002_*` migrations** into one file to remove filename-order ambiguity.
3. **Remove or adopt `lib/db/`** so the documentation doesn't need to describe unused scaffolding.
4. **Audit `lib/api-spec/openapi.yaml`** against the current route implementations and either regenerate the client or remove the Orval pipeline if it isn't being used.
5. **Extract the Vercel deployment section** into a dedicated `DEPLOYMENT.md` once the architecture stabilizes.
6. **Keep `README.md` and `replit.md` in sync** after any future code changes to routes, env vars, or migrations.

---

## Validation checklist

- Every command referenced in updated docs exists in `package.json` scripts.
- Every file path referenced in updated docs exists in the repository.
- Every environment variable documented in updated docs is read by the code (`grep` verified).
- Every API route documented in updated docs is registered in `artifacts/api-server/src/routes/index.ts`.
- Every migration referenced in `supabase/migrations/README.md` exists in `supabase/migrations/`.
- Removed documentation only described features/vars that no longer exist in the codebase.
- No speculative features were added.
- `CHANGELOG.md` contains only the documentation changes actually made.
