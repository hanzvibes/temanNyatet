# SumoPod PostgreSQL Primary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move TemanNyatet's notes, transactions, todos, and links to SumoPod PostgreSQL as the primary store while keeping Supabase for auth/profile data and Google Sheets safe as a migration/export path.

**Architecture:** The API will authenticate with Supabase as it does today, then read and write app data through a PostgreSQL repository using `DATABASE_URL`. Google Sheets remains available behind an explicit migration/export boundary and is not called during normal PostgreSQL-primary requests. A feature flag keeps the existing Sheets path available during rollout.

**Tech Stack:** TypeScript, Express 5, PostgreSQL, `pg`, Drizzle ORM, Supabase Auth, Google Sheets API, Vitest-compatible existing tests, pnpm workspace.

## Global Constraints

- PostgreSQL SumoPod is the primary store for notes, transactions, todos, and links.
- Supabase remains the source for auth, profiles, subscription, payment metadata, and AI credits.
- Google Sheets data must not be deleted or overwritten during migration.
- Database credentials must be provided through Replit Secrets as `DATABASE_URL`; never commit or print them.
- Every app-data query must enforce `user_id` ownership.
- Migration must be idempotent and preserve existing Google Sheets IDs.
- Google Sheets mirror failures must not fail a successful PostgreSQL write.
- Do not make Google Sheets and PostgreSQL equal competing sources of truth.

---

### Task 1: Add the PostgreSQL schema and connection configuration

**Files:**
- Create: `lib/db/src/schema/app-data.ts`
- Modify: `lib/db/src/schema/index.ts`
- Modify: `lib/db/drizzle.config.ts`
- Modify: `lib/db/src/index.ts`
- Create: `lib/db/src/schema/app-data.test.ts`
- Create: `docs/DATABASE-SUMOPOD.md`

**Interfaces:**
- Produces Drizzle tables and inferred types for `notes`, `transactions`, `todos`, `links`, and `sync_outbox`.
- Exposes the existing `db` and `pool` without opening a connection when `DATABASE_URL` is absent during type-only/test imports.

- [ ] **Step 1: Write failing schema tests**

Create tests that assert the exported table names, required ownership columns, preserved string IDs, and unique outbox event keys.

- [ ] **Step 2: Run the schema tests and confirm they fail**

Run:

```bash
pnpm --filter @workspace/db exec vitest run src/schema/app-data.test.ts
```

Expected: failure because the app-data tables are not defined.

- [ ] **Step 3: Define the tables**

Use UUID/string IDs compatible with existing Google Sheets IDs. Define:

```text
notes:
  id, user_id, title, content, tags, created_at, updated_at, position, color, deleted_at
transactions:
  id, user_id, type, amount, category, source, note, date, created_at, updated_at, deleted_at
todos:
  id, user_id, title, description, due_date, due_time, is_done, created_at, updated_at, deleted_at
links:
  id, user_id, title, url, note, created_at, updated_at, deleted_at
sync_outbox:
  id, user_id, entity_type, entity_id, operation, payload, status, attempts, last_error, created_at, updated_at
```

Add indexes for `(user_id, updated_at)`, `(user_id, date)` on transactions, `(user_id, is_done)` on todos, and a unique key for an outbox event.

- [ ] **Step 4: Run schema tests and typecheck**

Run:

```bash
pnpm --filter @workspace/db exec vitest run src/schema/app-data.test.ts
pnpm run typecheck:libs
```

Expected: all schema assertions pass and declarations build.

- [ ] **Step 5: Document the SumoPod setup**

Document `DATABASE_URL`, SSL expectations, pooling expectations, schema push/migration commands, and the rule that the connection string is supplied only through Secrets.

- [ ] **Step 6: Commit**

```bash
git add lib/db docs/DATABASE-SUMOPOD.md
git commit -m "feat: add PostgreSQL app data schema"
```

### Task 2: Build an ownership-safe PostgreSQL repository

**Files:**
- Create: `artifacts/api-server/src/lib/postgres-repository.ts`
- Create: `artifacts/api-server/src/lib/postgres-repository.test.ts`
- Modify: `artifacts/api-server/src/lib/logger.ts` only if repository logging needs the existing logger

**Interfaces:**
- Consumes the Drizzle tables from `@workspace/db`.
- Produces `listByUser`, `getById`, `create`, `update`, `remove`, and `transactionSummary` repository methods with explicit entity types.

- [ ] **Step 1: Write failing repository tests**

Cover:

```text
listByUser never returns another user's row
getById returns null for a row owned by another user
create forces the authenticated user_id
update and remove include both id and user_id
transactionSummary aggregates only the requested user's transactions
```

Use a repository factory with an injected database interface so tests do not require a live SumoPod connection.

- [ ] **Step 2: Run tests and confirm the ownership assertions fail**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/postgres-repository.test.ts
```

Expected: failure because the repository methods do not exist.

- [ ] **Step 3: Implement the minimal repository**

Use Drizzle query builders and explicit `eq(table.userId, userId)` predicates. Keep CRUD return shapes compatible with the current API route response objects. Convert database rows to the existing API field names only at the repository boundary.

- [ ] **Step 4: Run repository tests and typecheck**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/postgres-repository.test.ts
pnpm --filter @workspace/api-server run typecheck
```

Expected: all repository tests pass.

- [ ] **Step 5: Commit**

```bash
git add artifacts/api-server/src/lib/postgres-repository.ts artifacts/api-server/src/lib/postgres-repository.test.ts
git commit -m "feat: add ownership-safe PostgreSQL repository"
```

### Task 3: Add a controlled PostgreSQL-primary data mode

**Files:**
- Create: `artifacts/api-server/src/lib/data-store.ts`
- Modify: `artifacts/api-server/src/middleware/requireAuth.ts`
- Modify: `artifacts/api-server/src/routes/notes.ts`
- Modify: `artifacts/api-server/src/routes/transactions.ts`
- Modify: `artifacts/api-server/src/routes/todos.ts`
- Modify: `artifacts/api-server/src/routes/links.ts`
- Modify: `artifacts/api-server/src/routes/transaction-summary.ts`
- Create: `artifacts/api-server/src/lib/data-store.test.ts`

**Interfaces:**
- `data-store.ts` exposes the route-facing data operations and selects PostgreSQL only when `APP_DATA_STORE=postgres`; `sheets` remains the default until rollout.
- The middleware must not require a Google Sheets connection for PostgreSQL-primary routes.

- [ ] **Step 1: Write failing mode-selection tests**

Assert that:

```text
APP_DATA_STORE=postgres selects PostgreSQL without resolving a Sheets client
APP_DATA_STORE=sheets preserves the current behavior
an unknown mode fails explicitly at startup
```

- [ ] **Step 2: Run the tests and confirm failure**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/data-store.test.ts
```

- [ ] **Step 3: Implement the store boundary**

Add a single route-facing interface. In PostgreSQL mode, authenticate with the existing `requireUser` flow and use the repository. In Sheets mode, retain `requireAuth` and the existing `sheet-store` calls. Do not silently fall back between stores.

- [ ] **Step 4: Update routes with the boundary**

Replace direct `sheet-store` calls in the four CRUD routes and transaction summary route with the boundary while preserving request validation, response formats, typed spreadsheet errors, and existing API paths.

- [ ] **Step 5: Run tests, typecheck, and build**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/data-store.test.ts
pnpm run typecheck
pnpm --filter @workspace/api-server run build
```

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src
git commit -m "feat: add controlled PostgreSQL data mode"
```

### Task 4: Add migration from Google Sheets to PostgreSQL

**Files:**
- Create: `artifacts/api-server/src/lib/sheet-to-postgres.ts`
- Create: `artifacts/api-server/src/lib/sheet-to-postgres.test.ts`
- Create: `artifacts/api-server/scripts/migrate-sheets-to-postgres.mjs`
- Modify: `artifacts/api-server/package.json`
- Create: `docs/MIGRATE-SHEETS-TO-SUMOPOD.md`

**Interfaces:**
- `migrateSpreadsheet({ userId, spreadsheetId, sheets, db })` returns counts for imported, skipped, invalid, and failed rows.
- The migration uses upsert by `(user_id, id)` and is safe to run repeatedly.

- [ ] **Step 1: Write failing migration tests**

Cover empty tabs, valid rows, malformed rows, duplicate reruns, missing headers, and preservation of source IDs. Assert that the migration never calls a delete or update operation against Google Sheets.

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/sheet-to-postgres.test.ts
```

- [ ] **Step 3: Implement the migration adapter**

Read the existing sheet schema from `sheet-store.ts`, normalize values using the same conventions as current reads, validate required fields, and upsert inside PostgreSQL transactions. Record row-level errors in the result rather than aborting the entire user's migration for one malformed row.

- [ ] **Step 4: Add a guarded CLI**

Require an explicit user ID/spreadsheet ID or an explicit all-users flag. Refuse to run without `DATABASE_URL` and refuse destructive flags because this migration is import-only.

- [ ] **Step 5: Run tests and typecheck**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/sheet-to-postgres.test.ts
pnpm run typecheck
```

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src/lib/sheet-to-postgres.ts artifacts/api-server/src/lib/sheet-to-postgres.test.ts artifacts/api-server/scripts docs
git commit -m "feat: add idempotent Sheets to PostgreSQL migration"
```

### Task 5: Add asynchronous Google Sheets mirror support

**Files:**
- Create: `artifacts/api-server/src/lib/sync-outbox.ts`
- Create: `artifacts/api-server/src/lib/sheets-mirror.ts`
- Create: `artifacts/api-server/src/lib/sync-outbox.test.ts`
- Modify: `artifacts/api-server/src/lib/data-store.ts`
- Modify: `artifacts/api-server/src/routes/notes.ts`
- Modify: `artifacts/api-server/src/routes/transactions.ts`
- Modify: `artifacts/api-server/src/routes/todos.ts`
- Modify: `artifacts/api-server/src/routes/links.ts`

**Interfaces:**
- PostgreSQL mutation succeeds independently of mirror delivery.
- `enqueueMirrorJob` is idempotent for the same entity version.
- `processMirrorJob` records succeeded/failed status and bounded retry metadata.

- [ ] **Step 1: Write failing outbox tests**

Assert that a PostgreSQL mutation creates one outbox event, a repeated delivery does not create a duplicate event, and a mirror exception changes only outbox status while preserving the application row.

- [ ] **Step 2: Run tests and confirm failure**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/sync-outbox.test.ts
```

- [ ] **Step 3: Implement outbox enqueue and processing**

Use PostgreSQL transaction boundaries so the data mutation and outbox insert commit together. Keep Google API calls outside the database transaction. Use bounded retry metadata and log the user/entity identifiers without logging tokens or payload secrets.

- [ ] **Step 4: Add a worker trigger**

Add a guarded internal/cron processing path that claims a bounded batch, processes jobs, and releases/updates failed jobs. Do not make request latency depend on mirror completion.

- [ ] **Step 5: Run tests and build**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/lib/sync-outbox.test.ts
pnpm run typecheck
pnpm --filter @workspace/api-server run build
```

- [ ] **Step 6: Commit**

```bash
git add artifacts/api-server/src
git commit -m "feat: mirror PostgreSQL changes to Google Sheets asynchronously"
```

### Task 6: Roll out and verify PostgreSQL-primary mode

**Files:**
- Modify: `docs/replit.md`
- Modify: `docs/ENVIRONMENT.md`
- Modify: `.replit` only if a non-secret mode variable is needed
- Modify: deployment/environment configuration through the Secrets/environment flow, not committed files

**Interfaces:**
- `DATABASE_URL` is available as a Secret.
- `APP_DATA_STORE=postgres` is explicitly configured only after migration verification.

- [ ] **Step 1: Request and validate the SumoPod connection**

Request `DATABASE_URL` through the secure Secrets flow. Never ask the user to paste it into chat. Validate connectivity with a non-destructive query such as `SELECT 1`.

- [ ] **Step 2: Apply schema**

Run the project’s Drizzle schema command against the SumoPod database after confirming the target database is correct. Do not use force mode.

- [ ] **Step 3: Run a pilot migration**

Migrate one selected user/spreadsheet, inspect imported counts and row errors, and rerun to verify idempotency.

- [ ] **Step 4: Verify API behavior in Sheets mode**

Run typecheck, build, health check, and existing route tests before changing the feature flag.

- [ ] **Step 5: Switch the development workflow to PostgreSQL mode**

Set `APP_DATA_STORE=postgres`, restart both workflows, and verify login-independent health, authenticated CRUD with a test account, transaction summary, and no Google Sheets call on normal CRUD.

- [ ] **Step 6: Document rollout and rollback**

Record the required environment variables, migration command, mirror behavior, and the exact rollback procedure to `APP_DATA_STORE=sheets`.

- [ ] **Step 7: Commit**

```bash
git add docs .replit
git commit -m "docs: document SumoPod PostgreSQL rollout"
```

## Verification Checklist

- [ ] `pnpm run typecheck`
- [ ] `pnpm --filter @workspace/api-server run build`
- [ ] Schema, repository, mode-selection, migration, and outbox tests pass
- [ ] `GET /api/healthz` returns status ok
- [ ] PostgreSQL ownership tests prove cross-user rows cannot be read or modified
- [ ] Migration can be rerun without duplicates
- [ ] Google Sheets data remains unchanged by import
- [ ] Google Sheets outage does not fail a PostgreSQL write
- [ ] Rollback to Sheets mode is documented and tested