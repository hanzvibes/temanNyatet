---
name: Google Sheets OAuth Architecture
description: TemanNyatet per-user OAuth2 Sheets access — how tokens flow, where files live, what changed from service account.
---

# TemanNyatet — Per-User Google OAuth Architecture

## Rule
App data (notes, transactions, todos, links) lives in a Google Spreadsheet owned by each user. Access is via per-user OAuth2 tokens, NOT a shared service account.

**Why:** Service accounts have 0 Drive quota (can't create files), require users to manually share spreadsheets, and expose all user data to one credential.

## How to apply
When making changes to the Sheets integration, always pass `sheets: sheets_v4.Sheets` (from `req.sheetsClient`) as a parameter — never call a global `getSheets()`.

## Token flow
1. User clicks "Hubungkan Google Drive" → frontend fetches `GET /api/auth/google/initiate` (Bearer token) → gets `{ url }` → `window.location.href = url`
2. Google consent → redirect to `/api/auth/google/callback?code=...&state=...`
3. Backend verifies HMAC-signed state (userId + expiry), exchanges code for tokens
4. Stores `google_refresh_token` in `profiles.google_refresh_token`
5. Auto-creates spreadsheet via Drive API (`drive.file` scope) → stores ID in `profiles.spreadsheet_id`
6. Initializes sheet tabs + headers (`ensureSheetsInitialized`)
7. Redirects browser to `/connect-sheet?connected=true`
8. Frontend calls `refreshProfile()` → AuthGuard sees `profile.spreadsheet_id` set → navigates to app

## Key files
- `artifacts/api-server/src/lib/google-oauth.ts` — OAuth2 client factory, Drive/Sheets client creation, state HMAC
- `artifacts/api-server/src/lib/user-sheet.ts` — per-user connection cache (`UserSheetConnection { spreadsheetId, sheets }`)
- `artifacts/api-server/src/routes/auth-google.ts` — `/auth/google/initiate`, `/callback`, `/status`, `/disconnect`
- `artifacts/api-server/src/middleware/requireAuth.ts` — attaches `req.sheetsClient` (sheets_v4.Sheets) + `req.spreadsheetId`
- `artifacts/api-server/src/lib/sheet-store.ts` — all CRUD functions take `sheets` as last parameter
- `supabase/migrations/004_add_google_oauth.sql` — adds `google_refresh_token TEXT` to profiles

## Supabase migration required
Migration `004_add_google_oauth.sql` must be applied in Supabase SQL Editor before OAuth will work. The column `profiles.google_refresh_token` must exist.

## Scopes
- `https://www.googleapis.com/auth/spreadsheets` — read/write sheets
- `https://www.googleapis.com/auth/drive.file` — create files only (least privilege)

## CSRF protection
State parameter = `base64url(JSON{userId,expiresAt}).HMAC-SHA256`. Secret in `GOOGLE_OAUTH_STATE_SECRET`. TTL = 10 minutes.

## Error codes (428)
- `GOOGLE_NOT_CONNECTED` — no refresh token stored; frontend redirects to `/connect-sheet`
- `SPREADSHEET_NOT_CONNECTED` — has token but no spreadsheet_id (shouldn't happen normally)
