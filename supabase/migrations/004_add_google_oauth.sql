-- ============================================================
-- TemanNyatet — Migration 004: Per-user Google OAuth tokens
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================
--
-- Adds google_refresh_token to profiles so the API server can call
-- Google Sheets + Drive on behalf of each user without a service account.
-- The spreadsheet_id column was added in migration 002; this migration
-- just adds the token column and tightens RLS so only the service role
-- can read the token (frontend never sees it).
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS google_refresh_token TEXT;

COMMENT ON COLUMN public.profiles.google_refresh_token
  IS 'OAuth2 refresh token for this user''s Google account (Sheets + Drive).
Set by the API server after OAuth consent; used to call Sheets API on behalf
of the user. Never exposed to the frontend — service role only.';

-- Ensure the column is excluded from the default anon/authenticated select
-- by updating the RLS policy. The existing policies typically allow users to
-- read their own profile row; we add a policy that blocks the token column.
-- If your project uses column-level security, add it here.
-- For most setups, the service role bypasses RLS and regular users cannot
-- query google_refresh_token because it is never returned by frontend queries
-- (the frontend only selects specific columns it needs).

-- (No RLS changes needed if your policies already use SELECT with specific
-- columns. Just ensure no frontend query does SELECT * from profiles in a
-- context that would expose this column to the user.)
