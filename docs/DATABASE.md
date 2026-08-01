# DATABASE.md — TemanNyatet

> See also: [`ARCHITECTURE.md`](./ARCHITECTURE.md) (system overview), [`AUTH.md`](./AUTH.md) (profile columns used in auth).

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| AI_CONTEXT — quick reference for AI agents | [`AI_CONTEXT.md`](./AI_CONTEXT.md) |
| ARCHITECTURE — system architecture & data flow | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| AUTH — how profile columns are used in auth | [`AUTH.md`](./AUTH.md) |
| ENVIRONMENT — Supabase + Google credentials | [`ENVIRONMENT.md`](./ENVIRONMENT.md) |
| docs/SUPABASE-SETUP.md — setup SQL files | [`docs/SUPABASE-SETUP.md`](./SUPABASE-SETUP.md) |

---

## Overview

TemanNyatet uses **three data stores** with distinct responsibilities:

| Store | What lives there |
|---|---|
| **Supabase Postgres** | `profiles` — user metadata, subscription, Google OAuth tokens, spreadsheet ID; `user_credits` and `credit_ledger` — AI credit balance and immutable audit history |
| **SumoPod PostgreSQL** | Migrated app data — `notes`, `transactions`, `todos`, `links`, and `sync_outbox` |
| **Google Sheets (per user)** | Migration source and fallback app-data store for users not yet allowlisted for PostgreSQL |

App data never touches the legacy Supabase tables. The `notes`, `transactions`,
`todos`, and `links` Supabase tables were created by `001_initial_schema.sql`
and **dropped by `005_phase1_schema.sql`**. SumoPod PostgreSQL app-data tables
are a separate database/schema managed through `lib/db`.

---

## Supabase schema

### `profiles` table

Auto-created for every new user by a trigger on `auth.users` INSERT.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Foreign key → `auth.users.id`. Primary key. |
| `email` | `text` | User email address |
| `name` | `text \| null` | Display name |
| `phone` | `text \| null` | Phone number (optional) |
| `avatar_url` | `text \| null` | URL in Supabase Storage `avatars` bucket |
| `subscription_status` | `text` | `'pending'` \| `'active'` \| `'archived'` — default `'pending'` |
| `subscription_plan` | `text \| null` | `'monthly'` \| `'yearly'` |
| `subscription_end` | `timestamptz \| null` | Subscription expiry timestamp |
| `spreadsheet_id` | `text \| null` | Google Sheets spreadsheet ID for this user's data |
| `template_version` | `text \| null` | Spreadsheet template version used |
| `google_refresh_token` | `text \| null` | OAuth refresh token for Google Sheets access |
| `last_sync_at` | `timestamptz \| null` | Last successful sync timestamp |
| `sync_status` | `text \| null` | `'unknown'` \| `'ok'` \| `'error'` \| `'repair_needed'` |
| `recovery_metadata` | `jsonb \| null` | Recovery state metadata |
| `created_at` | `timestamptz` | Account creation timestamp |

**RLS**: enabled. Users can only read/update their own row. The trigger and the API server use the service role key to bypass RLS.

**Key behavior**:
- `AuthContext` client-side upsert also creates the profile as a fallback if the trigger didn't fire
- `subscription_status: 'pending'` → user must pay before accessing features
- `spreadsheet_id: null` → user must connect Google Drive before accessing features

### `user_credits` table

Stores the current AI summarization balance for each user.

| Column | Type | Description |
|---|---|---|
| `user_id` | `uuid` | Primary key and foreign key to `profiles.id` |
| `balance` | `integer` | Non-negative current balance; new users default to 10 |
| `created_at` | `timestamptz` | Creation timestamp |
| `updated_at` | `timestamptz` | Last balance update timestamp |

### `credit_ledger` table

Immutable audit records for credit consumption and grants. Negative amounts
represent AI usage; positive amounts represent signup credits or top-ups.

| Column | Type | Description |
|---|---|---|
| `id` | `uuid` | Primary key |
| `user_id` | `uuid` | Foreign key to `profiles.id` |
| `amount` | `integer` | Non-zero credit delta |
| `balance_after` | `integer` | Balance after the transaction |
| `reason` | `text` | Operation reason, such as `ai_summary` or `payment` |
| `reference_id` | `text \| null` | Idempotency reference for grants |
| `created_at` | `timestamptz` | Ledger entry timestamp |

Both tables have RLS enabled. Users can read their own records; server-side
RPCs perform atomic updates with the service role.

### Migration history

Run these in order in the Supabase SQL Editor. See [`docs/SUPABASE-SETUP.md`](./SUPABASE-SETUP.md) for full instructions.

| File | What it does |
|---|---|
| `001_initial_schema.sql` | Creates `profiles`, trigger, RLS; creates legacy data tables (dropped later) |
| `002_add_profile_fields.sql` | Adds `name`, `phone`, `avatar_url` to `profiles` |
| `002_add_spreadsheet_id.sql` | Adds `spreadsheet_id` to `profiles` |
| `002_add_avatar_url.sql` | Idempotent re-add of `avatar_url` (safe to run even if already applied) |
| `003_template_tracking.sql` | Adds `template_version` to `profiles` |
| `004_add_google_oauth.sql` | Adds `google_refresh_token` to `profiles` |
| `005_phase1_schema.sql` | Adds `last_sync_at`, `sync_status`, `recovery_metadata`; **drops** legacy data tables; refreshes RLS |
| `006_ai_credits.sql` | Adds `user_credits`, `credit_ledger`, signup credit trigger, and atomic balance RPCs |
| `fix_profiles_rls_recursion.sql` | Ad-hoc fix — drops + recreates `profiles` RLS policies to resolve infinite recursion. Apply if you see `infinite recursion detected in policy for relation "profiles"`. |

> ⚠️ Three files share the `002_*` prefix — the documented order above is authoritative. Run them in the sequence listed, not alphabetically.

The initial AI balance is 10 credits by default. To change the database-side
signup default, configure `app.initial_ai_credits` in PostgreSQL to the same
value used by the API server's `INITIAL_AI_CREDITS` environment variable.

---

## SumoPod PostgreSQL app-data schema

The active tables are `notes`, `transactions`, `todos`, `links`, and
`sync_outbox`. Every app-data table has an owning `user_id`, timestamps, and a
soft-delete marker. The repository always filters by both `id` and `user_id`
and excludes soft-deleted rows.

Important implementation detail: PostgreSQL `numeric` values such as
transaction `amount` may arrive in Node as strings. API consumers must coerce
numeric values before arithmetic (`Number(value) || 0`). Dates are returned as
ISO timestamps and the finance UI normalizes them to `YYYY-MM-DD` for
date-only filtering and grouping.

`sync_outbox` is currently prepared for the future Sheets mirror. It is not
yet processed by a worker, so PostgreSQL writes are not automatically exported
back to Sheets.

## Google Sheets schema (per-user spreadsheet)

Each user's spreadsheet is created automatically when they connect Google Drive. It contains 5 tabs:

### 📝 Notes tab

| Column | Type | Notes |
|---|---|---|
| `id` | string | UUID (generated by API server) |
| `user_id` | string | Supabase user ID |
| `title` | string | Optional, max 200 chars |
| `content` | string | Required, max 50,000 chars |
| `tags` | string | JSON array serialized to string (e.g. `["work","idea"]`) |
| `created_at` | string | ISO 8601 timestamp |
| `updated_at` | string | ISO 8601 timestamp |
| `position` | string | Numeric string; higher = displayed first. Used for drag-and-drop reorder. |

Sort order: by `position` descending, then by `created_at` descending.

### 💰 Transactions tab

| Column | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `user_id` | string | Supabase user ID |
| `type` | string | `'income'` or `'expense'` |
| `amount` | string | Integer (IDR), stored as string |
| `category` | string | One of the predefined categories (see below) |
| `source` | string | Payment source (see below) |
| `note` | string | Optional memo |
| `date` | string | `YYYY-MM-DD` |
| `created_at` | string | ISO 8601 timestamp |

**Income categories**: Gaji, Freelance, Bisnis, Investasi, Hadiah, Lainnya  
**Expense categories**: Makanan, Transport, Belanja, Tagihan, Kesehatan, Hiburan, Pendidikan, Lainnya  
**Payment sources**: BCA, BRI, BNI, Mandiri, GoPay, OVO, Dana, Cash, Lainnya

### ✅ Todos tab

| Column | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `user_id` | string | Supabase user ID |
| `title` | string | Required |
| `description` | string | Optional |
| `due_date` | string | `YYYY-MM-DD` or empty |
| `due_time` | string | `HH:MM` or empty |
| `is_done` | string | `'true'` or `'false'` stored as string |
| `created_at` | string | ISO 8601 timestamp |

### 🔗 Links tab

| Column | Type | Notes |
|---|---|---|
| `id` | string | UUID |
| `user_id` | string | Supabase user ID |
| `title` | string | Required |
| `url` | string | Full URL including protocol |
| `note` | string | Optional memo |
| `created_at` | string | ISO 8601 timestamp |

### 📦 _Archive tab

Soft-deleted rows from any data tab are moved here before physical removal.

| Column | Description |
|---|---|
| `id` | Original row UUID |
| `source_sheet` | Tab name the row was deleted from |
| `archived_at` | ISO 8601 timestamp of deletion |
| `user_id` | Supabase user ID |
| `row_data` | Original row JSON-serialized |

---

## Data type coercion

Google Sheets stores everything as strings. `sheet-store.ts` handles coercion:

- **`tags`**: serialized as JSON string, deserialized on read
- **`is_done`**: stored as `'true'`/`'false'`, parsed as boolean on read
- **Numeric values** (`amount`, `position`): Sheets stores them as strings; the Sheets reader parses them, and the frontend also guards API values because PostgreSQL `numeric` can serialize as a string
- **Formula injection guard**: strings starting with `=`, `+`, `-`, `@`, tab, or carriage return are prefixed with `'` to prevent CSV/spreadsheet formula injection

---

## Supabase Storage

One bucket: **`avatars`**

- Created automatically on first upload (no manual setup required)
- Uploads go through the API server at `POST /api/profile/avatar` using the service role key
- Stored URL saved in `profiles.avatar_url`

---

## Unused / legacy

- **`lib/db/`**: Drizzle ORM scaffold — `lib/db/src/schema/index.ts` is an empty placeholder. Never used. The source of truth for the live schema is the SQL files in `supabase/migrations/`.
- **Legacy Supabase tables**: `notes`, `transactions`, `todos`, `links` were created by `001_initial_schema.sql` and dropped by `005_phase1_schema.sql`. Do not reference them.
