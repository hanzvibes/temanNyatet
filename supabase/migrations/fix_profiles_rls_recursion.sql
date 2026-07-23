-- ============================================================
-- FIX: Infinite recursion in profiles RLS policies
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================
--
-- Drops ALL existing policies on profiles (including any stale/conflicting
-- ones from previous migrations or manual edits that cause the recursion),
-- then recreates them cleanly.
-- ============================================================

-- Step 1: Drop every policy on profiles unconditionally
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END;
$$;

-- Step 2: Recreate clean, non-recursive policies

-- Authenticated users can read their own row
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Authenticated users can update their own row
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow INSERT for the signup trigger and authenticated upsert
CREATE POLICY "Allow insert for own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'service_role');

-- Service role (API server + webhook) can update any row
CREATE POLICY "Service role can update any profile"
  ON public.profiles FOR UPDATE
  USING (auth.role() = 'service_role');

-- Step 3: Ensure authenticated role has table-level permissions
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- Done. Refresh the app after running this.
