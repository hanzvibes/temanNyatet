// Resolves the private Google Spreadsheet connected by a given user. Users
// connect their own spreadsheet via routes/spreadsheet.ts (POST /spreadsheet/connect)
// — this module never creates one on their behalf.
//
// Results are cached in memory with a short TTL so the hot path (every data
// request) avoids a Supabase round-trip most of the time, while still picking
// up a freshly-connected/changed spreadsheet quickly.
import { supabaseAdmin } from './supabase-admin';
import { logger } from './logger';

const CACHE_TTL_MS = 60 * 1000; // 1 minute

interface CacheEntry {
  spreadsheetId: string | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Returns the user's connected spreadsheet ID, or null if they haven't
// connected one yet.
export async function getUserSpreadsheetId(userId: string): Promise<string | null> {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.spreadsheetId;
  }

  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('spreadsheet_id')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    logger.error({ userId, err: error }, '[user-sheet] Failed to fetch profile.spreadsheet_id');
    throw new Error(`Failed to fetch profile for user ${userId}: ${error.message}`);
  }

  const spreadsheetId = (profile?.['spreadsheet_id'] as string | null) ?? null;
  cache.set(userId, { spreadsheetId, expiresAt: now + CACHE_TTL_MS });
  return spreadsheetId;
}

// Call after connecting/changing a user's spreadsheet so the next request
// picks up the new ID immediately instead of waiting out the cache TTL.
export function invalidateUserSheetCache(userId: string): void {
  cache.delete(userId);
}
