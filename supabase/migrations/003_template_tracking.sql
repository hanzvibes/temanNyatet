-- ============================================================
-- TemanNyatet — Migration 003: Template version tracking
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

-- Track which version of the master template spreadsheet each user has.
-- Populated when the user connects/reconnects their spreadsheet and the
-- api-server reads the _Metadata tab's template_version field.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS template_version TEXT;

COMMENT ON COLUMN public.profiles.template_version
  IS 'Version string from the _Metadata tab of the user''s connected spreadsheet template (e.g. "1.0.0"). Used to detect when a user needs to re-copy a newer template.';

-- ============================================================
-- OPTIONAL CLEANUP — drop legacy Supabase tables
-- ============================================================
-- The notes, transactions, todos, and links tables were created in migration
-- 001 but are NOT used — all app data lives in each user's private Google
-- Spreadsheet. Dropping them reduces DB bloat and eliminates any confusion
-- about where data actually lives.
--
-- IMPORTANT: Only uncomment if you are 100% sure there is no code path that
-- still writes to these tables. Verify with a SELECT COUNT(*) on each table
-- before dropping.
--
-- DROP TABLE IF EXISTS public.links;
-- DROP TABLE IF EXISTS public.todos;
-- DROP TABLE IF EXISTS public.transactions;
-- DROP TABLE IF EXISTS public.notes;
