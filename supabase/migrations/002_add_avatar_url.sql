-- ============================================================
-- TemanNyatet — Add profile photo support
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- ============================================================
-- DONE — profile photos are uploaded to Supabase Storage (bucket
-- "avatars", created automatically by the api-server on first upload)
-- and the public URL is stored in profiles.avatar_url. Uploads go
-- through the api-server using the service role key, so no storage
-- RLS policies are needed here.
-- ============================================================
