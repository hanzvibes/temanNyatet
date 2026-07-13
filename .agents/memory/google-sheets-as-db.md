---
name: Google Sheets as app-data backend (TemanNyatet)
description: Why/how TemanNyatet's notes/transactions/todos/links moved from Supabase to Google Sheets, and gotchas hit doing it.
---

TemanNyatet stores notes/transactions/todos/links in Google Sheets (via the api-server only) while auth and the `profiles`/subscription table stay in Supabase. This was a deliberate user choice (free + lets them hand-edit rows in the sheet), made after they were shown the risks of also moving auth there and declined that part.

**Why the split (auth stays on Supabase):** storing passwords/sessions in a spreadsheet is a real security risk (anyone with sheet-edit access or a leaked service-account key reads everything, no built-in password reset/email verification/brute-force protection). Data-only migration avoids that while still satisfying "free + manually editable."

**Gotchas hit during setup:**
- The Google service account credential must be the **entire** JSON key file content (`{"type":"service_account",...}`), not just the `private_key` field. A user pasted only the PEM private key once — `JSON.parse` failed with `Unexpected token 'M'`. If you see that exact parse error on `GOOGLE_SERVICE_ACCOUNT_KEY`, that's almost certainly the cause — ask for the full file again.
- Sheets has no realtime push. The frontend hooks poll every 15s instead of using Supabase Realtime subscriptions, so external edits made directly in the spreadsheet still surface without a manual refresh.
- Per-row auth: since Sheets has no RLS, every read/write in `sheet-store.ts` filters/verifies `user_id` server-side inside the api-server (never trust a client-supplied id across users).

**How to apply:** any future data model added to TemanNyatet should decide up front whether it belongs in Supabase (auth-adjacent, needs RLS/transactions) or Sheets (user wants to hand-edit, low write volume) — don't assume everything should follow one or the other.

**Schema/DDL changes on the live Supabase project:** there's no `DATABASE_URL`/direct Postgres connection available, only `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (REST/Storage API only — no raw SQL passthrough). Any `ALTER TABLE`/DDL must be written as a new file in `supabase/migrations/` and the user asked to run it once in the Supabase SQL Editor, same as the original schema setup. Example: profile photo upload needed `avatar_url` added to `profiles` this way.
