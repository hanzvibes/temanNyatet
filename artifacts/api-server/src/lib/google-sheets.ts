// Shared Google Sheets utilities: typed access errors and a retry helper.
// The actual Sheets client is now per-user (see google-oauth.ts + user-sheet.ts).
// This file no longer holds a global service-account client.
import crypto from 'crypto';
import { logger } from './logger';

export function newId(): string {
  return crypto.randomUUID();
}

// ─── Typed Sheets access errors ────────────────────────────────────────────
// Thrown when Google returns a definitive non-retryable error that the
// frontend needs to handle with a specific recovery UX rather than a
// generic "something went wrong" message.

export type SheetsAccessErrorCode =
  | 'SPREADSHEET_NOT_FOUND'
  | 'SPREADSHEET_ACCESS_DENIED';

export class SheetsAccessError extends Error {
  constructor(
    public readonly code: SheetsAccessErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SheetsAccessError';
  }
}

// ─── Retry helper ──────────────────────────────────────────────────────────
// Retries transient Google API failures (429, 5xx) with exponential backoff +
// jitter. 403 and 404 are NOT retried — they are rethrown immediately as
// SheetsAccessError so route handlers can return actionable error codes.

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

function getStatusCode(err: unknown): number | undefined {
  const anyErr = err as { code?: number; status?: number; response?: { status?: number } };
  return anyErr?.response?.status ?? anyErr?.code ?? anyErr?.status;
}

export async function withGoogleRetry<T>(fn: () => Promise<T>): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      const status = getStatusCode(err);

      // Non-retryable access errors — surface immediately with typed errors.
      if (status === 404) {
        throw new SheetsAccessError(
          'SPREADSHEET_NOT_FOUND',
          'Spreadsheet tidak ditemukan. Mungkin sudah dihapus atau dipindahkan.',
        );
      }
      if (status === 403) {
        throw new SheetsAccessError(
          'SPREADSHEET_ACCESS_DENIED',
          'Akses ke spreadsheet ditolak. Hubungkan ulang Google Drive kamu.',
        );
      }

      attempt += 1;
      if (!status || !RETRYABLE_STATUS.has(status) || attempt > MAX_RETRIES) {
        throw err;
      }
      const backoffMs = Math.min(2 ** attempt * 250, 4000) + Math.random() * 250;
      logger.warn(
        { status, attempt, backoffMs },
        '[google-sheets] Retrying after transient Google Sheets API error',
      );
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }
}
