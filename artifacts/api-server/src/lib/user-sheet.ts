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

export type UserSheetErrorCode =
  | 'SPREADSHEET_NOT_FOUND'
  | 'SPREADSHEET_ACCESS_DENIED'
  | 'GOOGLE_TOKEN_INVALID'
  | 'GOOGLE_NOT_CONNECTED';

export class UserSheetError extends Error {
  constructor(
    public readonly code: UserSheetErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'UserSheetError';
  }
}

interface CacheEntry {
  // null means: profile fetched but user is not connected (no token or no sheet)
  connection: UserSheetConnection | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function isInvalidGrantError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? '').toLowerCase();
  const code = String((err as { code?: string })?.code ?? '').toLowerCase();
  return code === 'invalid_grant' || msg.includes('invalid_grant');
}

function classifyGoogleError(err: unknown): UserSheetErrorCode {
  const anyErr = err as { code?: number; status?: number; response?: { status?: number } };
  const status = anyErr?.response?.status ?? anyErr?.code ?? anyErr?.status;
  if (status === 404) return 'SPREADSHEET_NOT_FOUND';
  if (status === 403) return 'SPREADSHEET_ACCESS_DENIED';
  if (isInvalidGrantError(err)) return 'GOOGLE_TOKEN_INVALID';
  return 'SPREADSHEET_ACCESS_DENIED';
}

// Returns the user's spreadsheet connection, or null if:
//   - they haven't connected Google OAuth yet (no google_refresh_token), or
//   - they haven't had a spreadsheet created yet (no spreadsheet_id).
// Throws on Supabase errors or on Google token failures so the caller can
// return the right status code to the frontend.
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

// Translates an arbitrary Google API error thrown while using a resolved
// connection into a typed UserSheetError so routes can return the correct
// HTTP status (e.g. 503 with a specific code). Invalidates the cache when the
// token is revoked/expired so the next request fetches fresh state.
export function classifyUserSheetError(err: unknown, userId?: string): UserSheetError {
  const code = classifyGoogleError(err);
  if (code === 'GOOGLE_TOKEN_INVALID' && userId) {
    invalidateUserSheetCache(userId);
  }

  const messages: Record<UserSheetErrorCode, string> = {
    SPREADSHEET_NOT_FOUND: 'Spreadsheet tidak ditemukan. Mungkin sudah dihapus atau dipindahkan.',
    SPREADSHEET_ACCESS_DENIED: 'Akses ke spreadsheet ditolak. Hubungkan ulang Google Drive kamu.',
    GOOGLE_TOKEN_INVALID: 'Token Google sudah tidak valid. Silakan hubungkan ulang Google Drive.',
    GOOGLE_NOT_CONNECTED: 'Hubungkan Google Drive kamu terlebih dahulu untuk menggunakan fitur ini.',
  };
  return new UserSheetError(code, messages[code]);
}

// Call after connecting/changing a user's Google account or spreadsheet so
// the next request picks up the new state immediately.
export function invalidateUserSheetCache(userId: string): void {
  cache.delete(userId);
}
