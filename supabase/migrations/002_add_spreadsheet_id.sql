-- ============================================================
-- TemanNyatet — Migration 002: Per-user Google Spreadsheet ID
-- Run this in your Supabase SQL Editor (supabase.com → SQL Editor)
-- ============================================================
--
-- Each user now has their own private Google Spreadsheet.
-- The api-server creates it automatically on first use and stores the ID here.
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS spreadsheet_id TEXT;

COMMENT ON COLUMN public.profiles.spreadsheet_id
  IS 'Google Spreadsheet ID of this user''s private data spreadsheet. Created automatically by the api-server on first login.';
