// Resolves (or lazily creates) the private Google Spreadsheet for a given user.
// Results are cached in memory with a TTL so the hot path avoids a Supabase
// round-trip on every single API call.
import { supabaseAdmin } from './supabase-admin';
import { createUserSpreadsheet } from './google-sheets';
import { ensureSheetsInitialized } from './sheet-store';
import { logger } from './logger';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  spreadsheetId: string;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

// Returns the spreadsheet ID for the user, creating one if it doesn't exist yet.
// The first call for a new user will hit Supabase + Google Sheets API; subsequent
// calls within the TTL window are served from memory.
export async function getOrCreateUserSpreadsheet(userId: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.spreadsheetId;
  }

  // Fetch from Supabase profiles table.
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('spreadsheet_id, email')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(`Failed to fetch profile for user ${userId}: ${error.message}`);
  }

  let spreadsheetId: string = profile?.spreadsheet_id ?? '';

  // First-time user — create a private spreadsheet.
  if (!spreadsheetId) {
    const email: string = profile?.email ?? userId;
    spreadsheetId = await createUserSpreadsheet(userId, email);

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ spreadsheet_id: spreadsheetId })
      .eq('id', userId);

    if (updateError) {
      logger.error(
        { userId, spreadsheetId, err: updateError },
        '[user-sheet] Failed to save spreadsheet_id to profile',
      );
      throw new Error(`Failed to save spreadsheet_id for user ${userId}: ${updateError.message}`);
    }

    // Initialize sheet tabs and headers right away so the first data call is instant.
    await ensureSheetsInitialized(spreadsheetId);
    logger.info({ userId, spreadsheetId }, '[user-sheet] Provisioned new spreadsheet for user');
  }

  cache.set(userId, { spreadsheetId, expiresAt: now + CACHE_TTL_MS });
  return spreadsheetId;
}

// Call this when you want to force a cache refresh (e.g. after admin operations).
export function invalidateUserSheetCache(userId: string): void {
  cache.delete(userId);
}
