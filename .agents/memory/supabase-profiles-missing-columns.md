---
name: Supabase profiles table missing columns
description: TemanNyatet's profiles table migration omitted name, phone, and avatar_url columns, causing name/phone/avatar updates to fail.
---

The TypeScript types in `artifacts/teman-nyatet/src/lib/database.types.ts` and the frontend (`SettingsSheet.tsx`, `AuthContext.tsx`) all expect `profiles` rows to have `name`, `phone`, and `avatar_url`. However, the original `supabase/migrations/001_initial_schema.sql` only defined:

- `id`
- `email`
- `subscription_status`
- `subscription_plan`
- `subscription_end`
- `created_at`

**Why:** This mismatch makes `supabase.from('profiles').update({ name: ... })` and the avatar upload endpoint fail with a missing-column error, which surfaces as the generic toast "Gagal memperbarui nama" or a 500 on `/api/profile/avatar`.

**How to apply:**
- For new projects: run the updated `001_initial_schema.sql`, which now includes the three columns.
- For existing databases that were created without the columns: run `supabase/migrations/002_add_profile_fields.sql` in the Supabase SQL Editor (idempotent `ADD COLUMN IF NOT EXISTS`).
- Always keep `database.types.ts` and the migration in sync; if one changes, update the other.
