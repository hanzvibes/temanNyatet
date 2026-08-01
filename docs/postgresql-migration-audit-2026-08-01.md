# PostgreSQL Migration Audit — 2026-08-01

## Scope

Audit development-side PostgreSQL migration and CRUD behavior for TemanNyatet while preserving:

- the existing `{ data: ... }` API response envelope;
- Google Sheets fallback for users outside the PostgreSQL allowlist;
- user ownership predicates on every read and mutation;
- historical migrations without rewriting or deleting them;
- no production database writes.

## Baseline findings

Development PostgreSQL was reachable and contained:

| Table | Rows |
| --- | ---: |
| `notes` | 18 |
| `transactions` | 21 |
| `todos` | 11 |
| `links` | 3 |

The audit found:

1. `todos.due_date` is stored as `timestamptz`, although the application treats it as a calendar date.
2. PostgreSQL numerics can arrive as strings and require API-boundary coercion.
3. `Boolean("false")` incorrectly produces `true`.
4. The app API accepts nullable text fields while the PostgreSQL app-data schema stores several of those columns as `NOT NULL` with empty-string defaults.
5. Empty update bodies could otherwise issue an update that only changes `updated_at`.
6. Transaction amount validation existed at the route boundary but not at the database boundary.
7. The sync outbox uniqueness strategy remains based on mutable `updated_at`; no runtime outbox consumer was found during this audit, so it was not changed speculatively.
8. No compatible local user relation was available for adding foreign keys; user ownership remains enforced in repository predicates.

## Changes made

### Repository boundary

- Added PostgreSQL scalar/date helpers in `artifacts/api-server/src/lib/postgres-fields.ts`.
- Numeric `amount` and note `position` values are normalized to numbers.
- Todo timestamps are serialized as `YYYY-MM-DD` calendar dates without timezone drift.
- Boolean values accept actual booleans and explicit string forms; `"false"` remains false.
- Transaction dates are parsed before persistence and invalid values are rejected.
- Nullable API text values are stored as empty strings where the current database schema requires `NOT NULL`, then normalized back to `null` in API responses.
- Existing ownership and soft-delete predicates remain on list, get, update, delete, and reorder operations.
- Reorder updates only active notes belonging to the authenticated user and runs inside a database transaction.

### API validation

- Todo `due_date` now requires a real `YYYY-MM-DD` calendar date.
- Transaction `date` now requires a valid date value.
- Empty update payloads return validation errors rather than performing a timestamp-only update.
- Existing URL, enum, amount, size, and Sheets fallback behavior remains intact.

### Database schema

- Added `lib/db/drizzle/0002_rainy_liz_osborn.sql`.
- Added an active per-user transaction index:
  `transactions_user_active_date_idx (user_id, deleted_at, date)`.
- Added `transactions_amount_positive` with `CHECK (amount > 0)`.
- The migration uses `CREATE INDEX IF NOT EXISTS` and a guarded constraint block for rerun safety.
- Updated the Drizzle schema and generated metadata.
- Applied the additive migration to development only; a second schema push reported no changes.

## Verification

### Test results

- API repository, validation, normalization, and migration-contract tests: **20 passed, 0 failed**.
- Frontend regression tests: **14 passed, 0 failed**.
- Workspace typecheck: **passed**.
- Workspace build: **passed**.
- `git diff --check`: **passed**.

The PostgreSQL integration regression covers:

- create/update/delete for notes, transactions, todos, and links;
- user ownership isolation;
- soft-delete visibility;
- numeric amount conversion;
- nullable text behavior;
- todo calendar dates;
- explicit boolean coercion;
- note reorder isolation across users.

### Runtime smoke checks

- API workflow restarted successfully and listened on port 8080.
- Web workflow restarted successfully and Vite listened on port 5000.
- `GET /api/healthz`: `200`, `{"status":"ok"}`.
- Unauthenticated `GET /api/notes`: `401` with the expected bearer-token error.
- Authenticated preview requests for notes and credits returned successful `304` responses.
- Browser console showed only normal Vite connection and React DevTools messages; no new application errors.
- Final preview screenshot saved at `screenshots/postgres-audit-final.jpg`.

## Data safety

The read-only audit confirmed:

- zero transactions with `amount <= 0`;
- zero transactions with null amount;
- zero null user IDs in the four app-data tables;
- six todos with due dates, all stored at midnight and covered by repository calendar normalization.

No production migration or production write was performed.

## Remaining limitations

- The authenticated runtime CRUD smoke test used the existing preview session only for read requests; deterministic authenticated mutation coverage is provided by the direct development PostgreSQL integration test.
- The `Start application` and legacy `API Server` workflow entries remain failed/obsolete; the registered artifact workflows are the healthy ones used for verification.
- Node 20 emits an upstream `@supabase/supabase-js` deprecation warning; it is unrelated to the PostgreSQL migration and does not block startup.