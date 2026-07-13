import { google, type sheets_v4 } from 'googleapis';
import crypto from 'crypto';
import { logger } from './logger';

const rawKey = process.env['GOOGLE_SERVICE_ACCOUNT_KEY'] ?? '';

let sheetsClient: sheets_v4.Sheets | null = null;
let serviceAccountEmail: string | null = null;
let configError: string | null = null;

if (!rawKey) {
  configError =
    'GOOGLE_SERVICE_ACCOUNT_KEY is not set. Data endpoints will fail until configured.';
  logger.warn(`[google-sheets] ${configError}`);
} else {
  try {
    const credentials = JSON.parse(rawKey) as { client_email: string; private_key: string };
    serviceAccountEmail = credentials.client_email;
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
  } catch (err) {
    configError = `Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY: ${(err as Error).message}`;
    logger.error(`[google-sheets] ${configError}`);
  }
}

export function isSheetsConfigured(): boolean {
  return sheetsClient !== null && !configError;
}

export function getSheetsConfigError(): string | null {
  return configError;
}

export function getSheets(): sheets_v4.Sheets {
  if (!sheetsClient) {
    throw new Error(configError ?? 'Google Sheets client is not configured');
  }
  return sheetsClient;
}

// The service account's email — users must share their own spreadsheet with
// this address (as Editor) so the backend can read/write it on their behalf.
// See routes/spreadsheet.ts for the user-initiated "connect" flow. We never
// create spreadsheets on the service account's own Drive — new service
// accounts get 0 bytes of Drive storage quota, which makes that impossible.
export function getServiceAccountEmail(): string | null {
  return serviceAccountEmail;
}

export function newId(): string {
  return crypto.randomUUID();
}
