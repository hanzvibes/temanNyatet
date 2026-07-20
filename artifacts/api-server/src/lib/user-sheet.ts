// Resolves the per-user Google Sheets connection (spreadsheet ID + OAuth client).
// Results are cached in memory with a short TTL to avoid a Supabase round-trip
// on every data request while still picking up reconnects quickly.
import { supabaseAdmin } from './supabase-admin';
import { createSheetsClient } from './google-oauth';
import { logger } from './logger';
import type { sheets_v4 } from 'googleapis';

const CACHE_TTL_MS = 60 * 1000; // 1 minute

export interface UserSheetConnection {
  spreadsheetId: string;
  sheets: sheets_v4.Sheets;
}

interface CacheEntry {
  // null means: profile fetched but user is not connected (no token or no sheet)
  connection: UserSheetConnection | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Returns the user's spreadsheet connection, or null if:
//   - they haven't connected Google OAuth yet (no google_refresh_token), or
//   - they haven't had a spreadsheet created yet (no spreadsheet_id).
// Throws on Supabase errors so the caller can return a 500.
export async function getUserSheetConnection(userId: string): Promise<UserSheetConnection | null> {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.connection;
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('spreadsheet_id, google_refresh_token')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    logger.error({ userId, err: error }, '[user-sheet] Failed to fetch profile');
    throw new Error(`Failed to fetch profile for user ${userId}: ${error.message}`);
  }

  const spreadsheetId = (profile?.['spreadsheet_id'] as string | null) ?? null;
  const refreshToken = (profile?.['google_refresh_token'] as string | null) ?? null;

  let connection: UserSheetConnection | null = null;
  if (spreadsheetId && refreshToken) {
    const sheets = createSheetsClient(refreshToken);
    connection = { spreadsheetId, sheets };
  }

  cache.set(userId, { connection, expiresAt: now + CACHE_TTL_MS });
  return connection;
}

// Call after connecting/changing a user's Google account or spreadsheet so
// the next request picks up the new state immediately.
export function invalidateUserSheetCache(userId: string): void {
  cache.delete(userId);
}
