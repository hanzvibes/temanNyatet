---
name: Supabase RLS recursion on profiles
description: TemanNyatet login stuck because the frontend SELECT on profiles hit a recursive RLS policy in Supabase. The fix fetches the profile via the API server (service role) instead.
---

# Supabase RLS recursion on `profiles`

## Symptom
- The login page succeeds, but the app never redirects to `/catatan`.
- Browser console shows: `infinite recursion detected in policy for relation "profiles"`.
- The issue occurs when the frontend (`AuthContext`) directly queries `public.profiles` through the Supabase client with the user's token.

## Root cause
- Row Level Security (RLS) policies on `public.profiles` in the project's Supabase project contain a recursive definition (likely a custom or leftover policy that references the same table inside its `USING`/`WITH CHECK` expression).
- The recursion is not visible in the migration files in this repository; it exists in the live Supabase project, so we cannot fix it directly from here without running SQL in the Supabase SQL Editor.

## Fix
- Move the profile lookup out of the frontend and into the API server, which uses the **service role key** and therefore bypasses RLS.
  - `GET /api/profile` returns the caller's profile and auto-creates it if missing.
  - `AuthContext` now calls `apiGet('/profile')` instead of `supabase.from('profiles').select('*')`.
- This immediately unblocks login without requiring manual SQL changes in the Supabase dashboard.

## Why this approach
- The only Supabase table the frontend still needs is `profiles`. Bypassing the broken RLS for this table is the fastest way to restore login.
- The API server already had the service role key, so no new credentials or integrations were needed.

## Long-term cleanup
- To remove the root cause in Supabase, run the RLS cleanup in `supabase/migrations/005_phase1_schema.sql` (and any later RLS fixes) inside the Supabase SQL Editor. Until then, the frontend will not hit the recursive policy.
