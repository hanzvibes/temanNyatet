-- ============================================================
-- TemanNyatet — Add missing profile fields
-- Run this after 001_initial_schema.sql if the profiles table
-- was already created without name, phone, or avatar_url.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS name      TEXT,
  ADD COLUMN IF NOT EXISTS phone     TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Default existing rows to NULL (already the default) so frontend
-- can update them without hitting a missing-column error.
