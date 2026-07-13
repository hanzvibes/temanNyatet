// Generic CRUD helper backing app data (notes, transactions, todos, links) with
// a shared Google Sheet acting as the database. Each sheet tab has a header
// row; rows are addressed by an `id` (UUID) column and isolated by `user_id`.
import { getSheets, newId } from './google-sheets';
import { logger } from './logger';

export const SHEET_SCHEMAS: Record<string, string[]> = {
  Notes: ['id', 'user_id', 'title', 'content', 'tags', 'created_at', 'updated_at'],
  Transactions: ['id', 'user_id', 'type', 'amount', 'category', 'source', 'note', 'date', 'created_at'],
  Todos: ['id', 'user_id', 'title', 'description', 'due_date', 'due_time', 'is_done', 'created_at'],
  Links: ['id', 'user_id', 'title', 'url', 'note', 'created_at'],
};

// Per-spreadsheet init cache — sheet headers only written once per process lifetime.
const initializedSheets = new Set<string>();

// Ensures every required tab exists with the correct header row.
export async function ensureSheetsInitialized(spreadsheetId: string): Promise<void> {
  if (initializedSheets.has(spreadsheetId)) return;
  const sheets = getSheets();

  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTitles = new Set((meta.data.sheets ?? []).map((s) => s.properties?.title));

  const missing = Object.keys(SHEET_SCHEMAS).filter((title) => !existingTitles.has(title));
  if (missing.length > 0) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
      },
    });
    logger.info({ missing, spreadsheetId }, '[sheet-store] Created missing sheet tabs');
  }

  for (const [title, headers] of Object.entries(SHEET_SCHEMAS)) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${title}!A1:${columnLetter(headers.length)}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [headers] },
    });
  }

  initializedSheets.add(spreadsheetId);
}

function columnLetter(n: number): string {
  let s = '';
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    num = Math.floor((num - 1) / 26);
  }
  return s;
}

function rowToObject(headers: string[], row: string[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? '';
  });
  return obj;
}

function coerceValue(header: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (header === 'tags' && Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

function decodeValue(header: string, value: unknown): unknown {
  if (header === 'tags') {
    try {
      return typeof value === 'string' && value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  }
  if (header === 'is_done') return value === 'true' || value === true;
  if (header === 'amount') return Number(value) || 0;
  return value;
}

function decodeRow(headers: string[], data: Record<string, unknown>): Record<string, unknown> {
  const decoded: Record<string, unknown> = {};
  for (const h of headers) decoded[h] = decodeValue(h, data[h]);
  return decoded;
}

async function readAllRows(
  spreadsheetId: string,
  sheetName: string,
): Promise<{ headers: string[]; rows: { sheetRow: number; data: Record<string, unknown> }[] }> {
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown sheet: ${sheetName}`);
  await ensureSheetsInitialized(spreadsheetId);
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:${columnLetter(headers.length)}`,
  });
  const values = res.data.values ?? [];
  const rows = values.map((row, idx) => ({
    sheetRow: idx + 2,
    data: rowToObject(headers, row as string[]),
  }));
  return { headers, rows };
}

// Returns only the rows belonging to the given user (server-side user_id filter).
export async function listByUser(
  spreadsheetId: string,
  sheetName: string,
  userId: string,
): Promise<Record<string, unknown>[]> {
  const { headers, rows } = await readAllRows(spreadsheetId, sheetName);
  return rows
    .filter((r) => r.data['user_id'] === userId)
    .map((r) => decodeRow(headers, r.data));
}

export async function createRow(
  spreadsheetId: string,
  sheetName: string,
  userId: string,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown sheet: ${sheetName}`);
  await ensureSheetsInitialized(spreadsheetId);

  const now = new Date().toISOString();
  const full: Record<string, unknown> = {
    id: newId(),
    user_id: userId,
    created_at: now,
    ...(headers.includes('updated_at') ? { updated_at: now } : {}),
    ...fields,
  };
  full['id'] = full['id'] ?? newId();
  full['user_id'] = userId;

  const row = headers.map((h) => coerceValue(h, full[h]));
  const sheets = getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:A`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });

  const result: Record<string, unknown> = {};
  for (const h of headers) result[h] = full[h];
  return result;
}

// Updates a row identified by id — only if it belongs to the caller's userId.
export async function updateRow(
  spreadsheetId: string,
  sheetName: string,
  id: string,
  userId: string,
  updates: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  const { headers, rows } = await readAllRows(spreadsheetId, sheetName);
  const target = rows.find((r) => r.data['id'] === id && r.data['user_id'] === userId);
  if (!target) return null;

  const currentDecoded = decodeRow(headers, target.data);
  const merged: Record<string, unknown> = {
    ...currentDecoded,
    ...updates,
    id: target.data['id'],
    user_id: userId,
    ...(headers.includes('updated_at') ? { updated_at: new Date().toISOString() } : {}),
  };

  const row = headers.map((h) => coerceValue(h, merged[h]));
  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${target.sheetRow}:${columnLetter(headers.length)}${target.sheetRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });

  const result: Record<string, unknown> = {};
  for (const h of headers) result[h] = merged[h];
  return result;
}

// Deletes a row by id — only if it belongs to the caller's userId.
export async function deleteRow(
  spreadsheetId: string,
  sheetName: string,
  id: string,
  userId: string,
): Promise<boolean> {
  const { rows } = await readAllRows(spreadsheetId, sheetName);
  const target = rows.find((r) => r.data['id'] === id && r.data['user_id'] === userId);
  if (!target) return false;

  const sheets = getSheets();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const sheetId = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName,
  )?.properties?.sheetId;
  if (sheetId === undefined || sheetId === null) throw new Error(`Sheet tab not found: ${sheetName}`);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: target.sheetRow - 1,
              endIndex: target.sheetRow,
            },
          },
        },
      ],
    },
  });

  return true;
}
