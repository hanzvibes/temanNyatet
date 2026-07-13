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
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.file',
      ],
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

// Creates a brand-new Google Spreadsheet for a user and returns its ID.
// The service account is the owner — it can read/write on behalf of the user.
export async function createUserSpreadsheet(userId: string, email: string): Promise<string> {
  const sheets = getSheets();

  const response = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `TemanNyatet — ${email}`,
      },
      sheets: [
        { properties: { title: 'Notes' } },
        { properties: { title: 'Transactions' } },
        { properties: { title: 'Todos' } },
        { properties: { title: 'Links' } },
      ],
    },
  });

  const spreadsheetId = response.data.spreadsheetId;
  if (!spreadsheetId) throw new Error('Spreadsheet created but no ID returned');

  logger.info({ userId, spreadsheetId }, '[google-sheets] Created user spreadsheet');
  return spreadsheetId;
}
