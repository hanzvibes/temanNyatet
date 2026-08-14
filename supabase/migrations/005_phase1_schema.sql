-- ============================================================
-- TemanNyatet — Migration 005: Phase 1 Foundation Cleanup
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================
--
-- Phase 1 of the hardened architecture:
--   1. Adds any missing profile columns needed for the app.
--   2. Drops legacy tables that are no longer used (all app data now lives
--      in PostgreSQL).
--   3. Ensures RLS policies on profiles are consistent.
--
-- All statements are idempotent (IF EXISTS / IF NOT EXISTS) so they are safe
-- to run on a fresh project or one that already has prior migrations applied.
-- ============================================================

-- ─── 1. Ensure all required profile columns exist ───────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name                 TEXT,
  ADD COLUMN IF NOT EXISTS phone                TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url           TEXT;

-- Ensure subscription columns have correct constraints
ALTER TABLE public.profiles
  ALTER COLUMN subscription_status SET DEFAULT 'pending',
  ADD CONSTRAINT IF NOT EXISTS profiles_subscription_status_check
    CHECK (subscription_status IN ('pending', 'active', 'archived'));

ALTER TABLE public.profiles
  ADD CONSTRAINT IF NOT EXISTS profiles_subscription_plan_check
    CHECK (subscription_plan IS NULL OR subscription_plan IN ('monthly', 'yearly'));

-- ─── 2. Drop legacy tables that are no longer used ──────────────────────────
-- All notes/transactions/todos/links data now lives in PostgreSQL. These
-- tables are empty in the current architecture and dropping them removes
-- confusion and DB bloat.
DROP TABLE IF EXISTS public.links CASCADE;
DROP TABLE IF EXISTS public.todos CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.notes CASCADE;

-- ─── 3. Refresh RLS policies on profiles ─────────────────────────────────
-- Recreate the core policies so they are definitely present and consistent.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update any profile" ON public.profiles;
CREATE POLICY "Service role can update any profile"
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'service_role');

-- Make sure authenticated role can still touch profiles (used by triggers/upserts)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;

-- ============================================================
-- DONE — Phase 1 schema cleanup complete.
-- ============================================================
