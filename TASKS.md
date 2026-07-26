# TASKS.md — TemanNyatet

> Actionable tasks derived from repository analysis. Categorized by impact. See `ROADMAP.md` for feature direction.

---

## Critical

### TASK-001: Set up external cron scheduler for subscription archiving

**Description**: `POST /api/cron/archive-expired` must be called daily to archive expired subscriptions. Vercel Cron only supports GET requests; no scheduler is currently configured.  
**Reason**: Without this, users whose subscriptions expire are never moved to `archived` status — they retain access indefinitely.  
**Affected files**: `artifacts/api-server/src/routes/cron.ts`, `DEPLOYMENT.md`  
**Complexity**: Low (GitHub Actions workflow or cron-job.org, ~30 min setup)

---

### TASK-002: Publish Google OAuth consent screen

**Description**: The Google OAuth consent screen must be in "Published" status to allow more than 100 test users.  
**Reason**: In "Testing" mode, only manually added test emails can complete the Google Drive connect flow. Real users will see an error.  
**Affected files**: Google Cloud Console (external, not in repo)  
**Complexity**: Low (one-click in Google Console, may require Google review if sensitive scopes are added)

---

## High

### TASK-003: Promote `fix_profiles_rls_recursion.sql` to a numbered migration

**Description**: Rename/integrate `fix_profiles_rls_recursion.sql` into the numbered migration sequence (e.g., `006_fix_profiles_rls.sql`). Remove the conflicting policy refresh from `005_phase1_schema.sql` if it causes the same recursion on fresh installs.  
**Reason**: Ad-hoc scripts outside the numbered sequence are easily missed during fresh database setup. The recursion error is a hard blocker — profiles can't be read.  
**Affected files**: `supabase/migrations/fix_profiles_rls_recursion.sql`, `supabase/migrations/005_phase1_schema.sql`, `supabase/migrations/README.md`  
**Complexity**: Medium (SQL changes + testing on a fresh Supabase project)

---

### TASK-004: Resolve `002_*` migration filename collision

**Description**: Three files share the `002_` prefix: `002_add_avatar_url.sql`, `002_add_profile_fields.sql`, `002_add_spreadsheet_id.sql`. Rename them to sequential numbers (006, 007, 008 or similar) or consolidate into a single file.  
**Reason**: File-system sort order is not guaranteed to match the intended run order. Automated migration tools would apply them in the wrong order.  
**Affected files**: `supabase/migrations/002_add_avatar_url.sql`, `supabase/migrations/002_add_profile_fields.sql`, `supabase/migrations/002_add_spreadsheet_id.sql`, `supabase/migrations/README.md`  
**Complexity**: Low (rename files + update docs), but requires care not to break already-applied migrations

---

### TASK-005: Migrate data hooks to TanStack Query `useQuery`

**Description**: Replace the module-level `Map` cache + polling pattern in `useNotes`, `useTransactions`, `useTodos`, `useLinks` with `useQuery` from TanStack Query.  
**Reason**: Two caching systems exist in parallel. `useQuery` provides automatic retry, background refetch, loading/error states, and proper integration with `QueryClient.invalidateQueries`. The module-level Map cache is a workaround that predates CachedSwitch.  
**Affected files**: `artifacts/teman-nyatet/src/hooks/useNotes.ts`, `useTransactions.ts`, `useTodos.ts`, `useLinks.ts`  
**Complexity**: High (careful migration needed; optimistic updates and error handling must be preserved)

---

### TASK-006: Remove or adopt `lib/db/` Drizzle scaffolding

**Description**: `lib/db/` contains Drizzle ORM setup with an empty schema (`lib/db/src/schema/index.ts`). Either remove it entirely or adopt it to manage the `profiles` table schema.  
**Reason**: Dead code causes confusion — it implies the app uses an ORM when it doesn't. If adopted, it could provide type-safe Supabase Postgres access from the API server.  
**Affected files**: `lib/db/src/`, `lib/db/package.json`, `lib/db/drizzle.config.ts`, `pnpm-workspace.yaml`  
**Complexity**: Low (remove) or High (adopt — schema, migrations, query migration)

---

### TASK-007: Audit `lib/api-spec/openapi.yaml` against current API routes

**Description**: Compare `lib/api-spec/openapi.yaml` against the actual routes in `artifacts/api-server/src/routes/`. Update the spec or remove the Orval pipeline if it's no longer useful.  
**Reason**: The Orval-generated client is only used for token wiring in `main.tsx`. If the spec is stale, the generated types may be wrong. If the pipeline isn't used for data fetching, consider simplifying by removing it.  
**Affected files**: `lib/api-spec/openapi.yaml`, `lib/api-spec/orval.config.ts`, `lib/api-client-react/`, `lib/api-zod/`  
**Complexity**: Medium (audit + update spec or remove pipeline)

---

## Medium

### TASK-008: Add keyboard-accessible delete for long-press items

**Description**: Long-press delete in KeuanganPage and LinkSaverPage is mouse/touch only. Add a keyboard-accessible alternative (e.g., a delete button in an edit modal, or a `Delete` key handler when an item is focused).  
**Reason**: WCAG 2.5.1 — pointer gestures must have a single-pointer or keyboard alternative. Tab-focused items with no keyboard delete path fail this criterion.  
**Affected files**: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`, `artifacts/teman-nyatet/src/pages/LinkSaverPage.tsx`  
**Complexity**: Medium

---

### TASK-009: Add delete confirmation for long-press delete

**Description**: Long-press delete (transactions, links) deletes immediately with no confirmation. Add a confirmation step (e.g., a small toast with "Undo" for 5 seconds, or a confirm dialog).  
**Reason**: Accidental long-press on mobile deletes data with no recovery path.  
**Affected files**: `artifacts/teman-nyatet/src/pages/KeuanganPage.tsx`, `artifacts/teman-nyatet/src/pages/LinkSaverPage.tsx`  
**Complexity**: Medium

---

### TASK-010: UX improvements — Issues #2 and #3

**Description**: The maintainer has identified 3 high-impact UX issues. Issue #1 (empty state CTAs) is complete. Issues #2 and #3 are to be specified.  
**Reason**: Improve user experience for the target mobile audience.  
**Affected files**: TBD  
**Complexity**: TBD

---

## Low

### TASK-011: Add distributed lock for Google Sheets mutations

**Description**: Replace the in-process `Map` lock in `sheet-store.ts` with a shared lock (e.g., Postgres advisory lock keyed by `spreadsheetId:sheetName`).  
**Reason**: The current lock only works within a single process. Vercel serverless mitigates this (single instance per invocation), but any future move to a long-running server would re-expose the concurrency issue.  
**Affected files**: `artifacts/api-server/src/lib/sheet-store.ts`  
**Complexity**: Medium (requires Postgres connection in API server, advisory lock pattern)

---

### TASK-012: Add `GET` handler to cron endpoint for Vercel Cron compatibility

**Description**: Add a `GET /api/cron/archive-expired` handler (same logic as POST) so the endpoint can be called by Vercel Cron Jobs if desired.  
**Reason**: Currently, Vercel's built-in Cron Jobs can't call this endpoint (POST only).  
**Affected files**: `artifacts/api-server/src/routes/cron.ts`, `artifacts/api-server/vercel.json`  
**Complexity**: Low
