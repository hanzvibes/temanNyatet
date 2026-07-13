import { google, type sheets_v4 } from 'googleapis';
import crypto from 'crypto';
import { logger } from './logger';

const rawKey = process.env['GOOGLE_SERVICE_ACCOUNT_KEY'] ?? '';

let sheetsClient: sheets_v4.Sheets | null = null;
let configError: string | null = null;

if (!rawKey) {
  configError =
    'GOOGLE_SERVICE_ACCOUNT_KEY is not set. Data endpoints will fail until configured.';
  logger.warn(`[google-sheets] ${configError}`);
} else {
  try {
    const credentials = JSON.parse(rawKey) as { client_email: string; private_key: string };
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

export function newId(): string {
  return crypto.randomUUID();
}

// Creates a new Google Spreadsheet owned by the service account and returns
// its spreadsheetId. The caller is responsible for sharing it with the user
// afterwards (requires Drive API scope — see user-sheet.ts).
export async function createUserSpreadsheet(
  _userId: string,
  email: string,
): Promise<string> {
  const sheets = getSheets();
  const { data } = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `TemanNyatet – ${email}` },
    },
  });
  const spreadsheetId = data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('[google-sheets] Sheets API did not return a spreadsheetId');
  }
  logger.info({ spreadsheetId, email }, '[google-sheets] Created new user spreadsheet');
  return spreadsheetId;
}
