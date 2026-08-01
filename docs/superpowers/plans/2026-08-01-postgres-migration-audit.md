# PostgreSQL Migration Audit and Regression Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore reliable PostgreSQL-backed CRUD behavior across notes, transactions, todos, and links while preserving user isolation, legacy Sheets fallback, and data formats.

**Architecture:** Keep the existing data-store boundary and API contracts. Normalize PostgreSQL values at the repository boundary, use calendar-safe date handling for todo and transaction data, validate inputs before persistence, and add additive schema safeguards without rewriting historical migrations. Exercise the repository with deterministic unit tests plus full workspace typecheck/build and live API smoke tests.

**Tech Stack:** TypeScript, Express, Drizzle ORM, PostgreSQL, Node test runner, React/Vite.

## Global Constraints

- Preserve the existing `{ data: ... }` API response contract.
- Do not rewrite or delete historical migrations.
- Add only additive, idempotent schema changes.
- Keep Google Sheets fallback behavior for users outside the PostgreSQL allowlist.
- Never expose secrets or use production writes during this audit.
- Preserve existing user ownership predicates on every read and mutation.

---

### Task 1: Establish migration and repository regression tests

**Files:**
- Create: `artifacts/api-server/src/lib/postgres-repository.test.ts`
- Create: `artifacts/api-server/src/lib/migration-contract.test.ts`
- Modify: `artifacts/api-server/package.json`

**Interfaces:**
- Tests consume the repository factory with a fake Drizzle-shaped database and assert returned API rows and mutation predicates.
- Tests inspect migration files as text and assert the canonical app-data tables/indexes remain represented.

- [x] **Step 1: Write failing repository tests**
  - Cover PostgreSQL numeric amounts returned as strings.
  - Cover todo date-only input/output without timezone drift.
  - Cover nullable text values remaining `null`.
  - Cover update/delete ownership predicates and soft-delete exclusion.
  - Cover reorder only updates IDs belonging to the authenticated user.

- [x] **Step 2: Run the focused tests and verify they fail for the migration regressions**
  - Run: `pnpm --filter @workspace/api-server exec tsx --test src/lib/postgres-repository.test.ts`
  - Expected: failures for date normalization, boolean coercion, or repository behavior that is not yet covered/correct.

- [x] **Step 3: Write failing migration contract tests**
  - Assert the latest Drizzle migration removes the obsolete outbox `deleted_at` column only once.
  - Assert app-data migration SQL contains user/date indexes and amount/date integrity safeguards after the fix.
  - Assert migration filenames are deterministic and no legacy destructive rewrite is introduced.

- [x] **Step 4: Run the migration contract test and confirm the expected failure**
  - Run: `pnpm --filter @workspace/api-server exec tsx --test src/lib/migration-contract.test.ts`

- [x] **Step 5: Add a package test script**
  - Add `"test": "tsx --test src/**/*.test.ts"` to `artifacts/api-server/package.json`.

### Task 2: Normalize PostgreSQL repository data and CRUD semantics

**Files:**
- Modify: `artifacts/api-server/src/lib/postgres-repository.ts`
- Modify: `artifacts/api-server/src/lib/validate.ts`
- Test: `artifacts/api-server/src/lib/postgres-repository.test.ts`

**Interfaces:**
- Keep `createPostgresRepository(database)` and all existing repository method signatures.
- Add internal calendar-date parsing/serialization helpers used only at the repository boundary.

- [x] **Step 1: Implement date-safe conversion**
  - Treat `todos.due_date` as a calendar date: accept `YYYY-MM-DD` and persist/read it without converting through local timezone.
  - Keep transaction timestamps ISO-compatible while rejecting invalid dates before the database call.

- [x] **Step 2: Fix scalar coercion**
  - Convert PostgreSQL numeric `amount` and `position` values to the API representation expected by existing clients.
  - Convert boolean fields only from actual booleans or explicit `"true"`/`"false"` values; never use `Boolean("false")`.
  - Preserve nullable fields as `null`, including `color`, `note`, `description`, `due_time`, `category`, and `source`.

- [x] **Step 3: Enforce update and reorder safety**
  - Reject empty update payloads at the route/validation boundary.
  - Make reorder operate only on the authenticated user’s active notes and update positions in one transaction where supported by the injected database.
  - Preserve soft-delete filtering on all reads and mutations.

- [x] **Step 4: Run focused repository tests and confirm green**
  - Run: `pnpm --filter @workspace/api-server exec tsx --test src/lib/postgres-repository.test.ts`

### Task 3: Add additive PostgreSQL integrity safeguards

**Files:**
- Modify: `lib/db/src/schema/app-data.ts`
- Create: `lib/db/drizzle/0002_postgres_integrity_safeguards.sql`
- Test: `artifacts/api-server/src/lib/migration-contract.test.ts`

**Interfaces:**
- Keep existing table names and API-facing columns unchanged.
- Add constraints/indexes only where compatible with current data and soft-delete behavior.

- [x] **Step 1: Add schema declarations**
  - Add a date-only PostgreSQL representation for `todos.due_date` if the current development data is compatible; otherwise retain the existing timestamp column and enforce repository-level calendar normalization.
  - Add indexes supporting active per-user reads and soft-delete filtering.
  - Add a transaction amount check only after a read-only data audit confirms no invalid existing rows.

- [x] **Step 2: Write the idempotent migration**
  - Use `IF NOT EXISTS` for indexes.
  - Add checks with a named constraint and a guarded `DO` block so reruns do not fail.
  - Do not add foreign keys to Supabase auth tables unless the database actually contains a compatible local relation.

- [x] **Step 3: Run the migration contract test**
  - Run: `pnpm --filter @workspace/api-server exec tsx --test src/lib/migration-contract.test.ts`

- [x] **Step 4: Apply only to the development database through the project’s supported schema workflow**
  - Run the existing Drizzle schema command only after checking current rows and confirming the constraint is safe.
  - Do not run production writes.

### Task 4: Harden all API CRUD routes and fallback selection

**Files:**
- Modify: `artifacts/api-server/src/routes/notes.ts`
- Modify: `artifacts/api-server/src/routes/transactions.ts`
- Modify: `artifacts/api-server/src/routes/todos.ts`
- Modify: `artifacts/api-server/src/routes/links.ts`
- Modify: `artifacts/api-server/src/lib/data-store.ts`
- Modify: `artifacts/api-server/src/middleware/requireAuth.ts`
- Add tests beside the affected validation/repository helpers where needed.

**Interfaces:**
- Preserve route paths, status codes, and `{ data: ... }` response envelopes.
- Preserve `GOOGLE_NOT_CONNECTED` behavior for Sheets users and PostgreSQL bypass for allowlisted users.

- [x] **Step 1: Validate date and empty-update inputs**
  - Require strict `YYYY-MM-DD` for todo dates.
  - Require valid ISO-compatible transaction dates.
  - Return 400 for empty update bodies rather than issuing a database update that only changes `updated_at`.

- [x] **Step 2: Validate PostgreSQL-sensitive values at the route boundary**
  - Keep positive transaction amount validation.
  - Bound todo time values separately from dates.
  - Keep URL scheme validation and existing size limits.

- [x] **Step 3: Verify middleware consistency**
  - Ensure every data route uses `requireAuth`.
  - Keep profile/auth routes on `requireUser` where they do not access app data.
  - Ensure store mode and allowlist decisions are made in one data-store module.

- [x] **Step 4: Run API typecheck and focused tests**
  - Run: `pnpm --filter @workspace/api-server run typecheck`
  - Run: `pnpm --filter @workspace/api-server test`

### Task 5: Align frontend regression handling with PostgreSQL responses

**Files:**
- Modify: `artifacts/teman-nyatet/src/hooks/useTransactions.ts`
- Modify: `artifacts/teman-nyatet/src/hooks/useTodos.ts`
- Modify: `artifacts/teman-nyatet/src/hooks/useLinks.ts`
- Modify: `artifacts/teman-nyatet/src/hooks/useNotes.ts`
- Modify: `artifacts/teman-nyatet/src/lib/database.types.ts` only if the existing types contradict the API contract.
- Test: existing frontend date/normalization tests plus new focused tests only if a new helper is extracted.

**Interfaces:**
- Continue using the shared `apiClient` unwrapping of `{ data: ... }`.
- Keep optimistic updates and rollback behavior.

- [x] **Step 1: Normalize sorting and date rendering through shared safe helpers**
  - Avoid direct `new Date()` on malformed/null values.
  - Treat todo date-only values as calendar dates.
  - Keep numeric string amounts usable in summaries and charts.

- [x] **Step 2: Preserve cache isolation**
  - Ensure user changes/sign-out cannot retain another user’s module data.
  - Ensure failed first loads expose an error state without replacing valid cached data.

- [x] **Step 3: Run frontend typecheck and build**
  - Run: `pnpm --filter @workspace/teman-nyatet run typecheck`
  - Run: `pnpm --filter @workspace/teman-nyatet run build`

### Task 6: Full regression verification and audit report

**Files:**
- Create: `docs/postgresql-migration-audit-2026-08-01.md`
- Modify: `replit.md` only if runtime/schema instructions discovered during verification are missing.

- [x] **Step 1: Run all unit and contract tests**
  - Run: `pnpm --filter @workspace/api-server test`
  - Run: `pnpm exec tsx --test artifacts/teman-nyatet/src/lib/*.test.ts`

- [x] **Step 2: Run workspace checks**
  - Run: `pnpm run typecheck`
  - Run: `pnpm run build`

- [x] **Step 3: Restart both workflows and inspect logs**
  - Restart `artifacts/teman-nyatet: web`.
  - Restart `artifacts/api-server: API Server`.
  - Confirm frontend Vite startup, API startup, and no new database errors.

- [x] **Step 4: Run authenticated CRUD smoke tests**
  - Use the existing authenticated preview/session only; do not print tokens.
  - Verify list/create/update/delete for notes, transactions, todos, and links.
  - Verify note reorder, transaction summary, user isolation, and soft-delete visibility.

- [x] **Step 5: Capture a screenshot and write the audit report**
  - Include root causes, files changed, migration safety notes, test commands/results, and any remaining external-service limitations.