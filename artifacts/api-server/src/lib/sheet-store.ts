// Generic CRUD helper backing app data (notes, transactions, todos, links)
// with a per-user Google Sheet as the database. Each sheet tab has a header
// row; rows are addressed by an `id` (UUID) column and isolated by `user_id`.
// Deleted rows are moved to `_Archive` before physical removal.
//
// All public functions receive a `sheets` client (per-user OAuth) rather than
// calling a global service-account client.
import type { sheets_v4 } from 'googleapis';
import { newId, withGoogleRetry } from './google-sheets';
import { logger } from './logger';

// ─── Sheet schemas ──────────────────────────────────────────────────────────

export const SHEET_SCHEMAS: Record<string, string[]> = {
  '📝 Notes':        ['id', 'user_id', 'title', 'content', 'tags', 'created_at', 'updated_at'],
  '💰 Transactions': ['id', 'user_id', 'type', 'amount', 'category', 'source', 'note', 'date', 'created_at'],
  '✅ Todos':        ['id', 'user_id', 'title', 'description', 'due_date', 'due_time', 'is_done', 'created_at'],
  '🔗 Links':        ['id', 'user_id', 'title', 'url', 'note', 'created_at'],
};

// Archive tab stores soft-deleted rows from any data tab.
const _ARCHIVE_TAB = '📦 _Archive';
const _ARCHIVE_HEADERS = ['id', 'source_sheet', 'archived_at', 'user_id', 'row_data'];

// ─── Per-spreadsheet init cache ─────────────────────────────────────────────
// Sheet headers are only written once per process lifetime per spreadsheet.

const initializedSheets = new Set<string>();

// ─── Async sheet lock ────────────────────────────────────────────────────────
// Serializes mutating operations (create/update/delete) against the same
// sheet tab so two concurrent requests can't interleave a read-then-write
// span. Google Sheets has no transactions, so this in-process queue is the
// concurrency guard. (Single-instance only — horizontal scaling would need
// a shared lock e.g. Postgres advisory lock keyed by spreadsheet+sheet.)

const sheetLocks = new Map<string, Promise<unknown>>();

function withSheetLock<T>(spreadsheetId: string, sheetName: string, fn: () => Promise<T>): Promise<T> {
  const key = `${spreadsheetId}:${sheetName}`;
  const previous = sheetLocks.get(key) ?? Promise.resolve();
  const run = previous.then(fn, fn);
  sheetLocks.set(key, run.then(() => undefined, () => undefined));
  return run;
}

// ─── Initialization ──────────────────────────────────────────────────────────

// Ensures every required tab (data tabs + _Archive) exists with the correct
// header row. Called on the first request for each spreadsheet per process,
// and also during OAuth setup to initialize a freshly-created spreadsheet.
export async function ensureSheetsInitialized(
  spreadsheetId: string,
  sheets: sheets_v4.Sheets,
): Promise<void> {
  if (initializedSheets.has(spreadsheetId)) return;

  const meta = await withGoogleRetry(() => sheets.spreadsheets.get({ spreadsheetId }));
  const existingTitles = new Set((meta.data.sheets ?? []).map((s) => s.properties?.title));

  // All tabs that must exist: data tabs + _Archive
  const allRequiredTabs = [...Object.keys(SHEET_SCHEMAS), _ARCHIVE_TAB];
  const missing = allRequiredTabs.filter((title) => !existingTitles.has(title));

  if (missing.length > 0) {
    await withGoogleRetry(() =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
        },
      }),
    );
    logger.info({ missing, spreadsheetId }, '[sheet-store] Created missing sheet tabs');
  }

  // Write/repair header rows for all data tabs
  for (const [title, headers] of Object.entries(SHEET_SCHEMAS)) {
    await withGoogleRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${title}'!A1:${columnLetter(headers.length)}1`,
        valueInputOption: 'RAW',
        requestBody: { values: [headers] },
      }),
    );
  }

  // Write/repair _Archive header row
  await withGoogleRetry(() =>
    sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${_ARCHIVE_TAB}'!A1:${columnLetter(_ARCHIVE_HEADERS.length)}1`,
      valueInputOption: 'RAW',
      requestBody: { values: [_ARCHIVE_HEADERS] },
    }),
  );

  initializedSheets.add(spreadsheetId);
}

// ─── Repair utility ──────────────────────────────────────────────────────────

export async function repairHeaders(
  spreadsheetId: string,
  sheets: sheets_v4.Sheets,
): Promise<{ repaired: string[] }> {
  initializedSheets.delete(spreadsheetId);
  await ensureSheetsInitialized(spreadsheetId, sheets);
  return { repaired: [...Object.keys(SHEET_SCHEMAS), _ARCHIVE_TAB] };
}

// ─── Column helpers ──────────────────────────────────────────────────────────

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
  headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
  return obj;
}

// ─── Formula injection guard ─────────────────────────────────────────────────
// Characters that Excel/Sheets/LibreOffice treat as the start of a formula
// when a cell's text is re-parsed. `RAW` value input prevents live execution,
// but users who export to CSV/XLSX and open in Excel could trigger DDE payloads.
// Prefixing with a single quote is the standard mitigation.

const FORMULA_TRIGGER_CHARS = new Set(['=', '+', '-', '@', '\t', '\r']);

function sanitizeForSpreadsheet(value: string): string {
  if (value.length > 0 && FORMULA_TRIGGER_CHARS.has(value[0] as string)) {
    return `'${value}`;
  }
  return value;
}

function coerceValue(header: string, value: unknown): string {
  if (value === null || value === undefined) return '';
  if (header === 'tags' && Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === 'string') return sanitizeForSpreadsheet(value);
  return String(value);
}

function decodeValue(header: string, value: unknown): unknown {
  if (header === 'tags') {
    try { return typeof value === 'string' && value ? JSON.parse(value) : []; }
    catch { return []; }
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

// ─── Internal read helper ────────────────────────────────────────────────────

async function readAllRows(
  spreadsheetId: string,
  sheetName: string,
  sheets: sheets_v4.Sheets,
): Promise<{ headers: string[]; rows: { sheetRow: number; data: Record<string, unknown> }[] }> {
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown sheet: ${sheetName}`);
  await ensureSheetsInitialized(spreadsheetId, sheets);
  const res = await withGoogleRetry(() =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!A2:${columnLetter(headers.length)}`,
    }),
  );
  const values = res.data.values ?? [];
  const rows = values.map((row, idx) => ({
    sheetRow: idx + 2,
    data: rowToObject(headers, row as string[]),
  }));
  return { headers, rows };
}

// ─── Archive helper ──────────────────────────────────────────────────────────

async function archiveDeletedRow(
  spreadsheetId: string,
  sourceSheet: string,
  data: Record<string, unknown>,
  sheets: sheets_v4.Sheets,
): Promise<void> {
  const archiveRow = [
    String(data['id'] ?? ''),
    sourceSheet,
    new Date().toISOString(),
    String(data['user_id'] ?? ''),
    JSON.stringify(data),
  ];
  await withGoogleRetry(() =>
    sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `'${_ARCHIVE_TAB}'!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [archiveRow] },
    }),
  );
}

// ─── Public CRUD API ─────────────────────────────────────────────────────────

export async function listByUser(
  spreadsheetId: string,
  sheetName: string,
  userId: string,
  sheets: sheets_v4.Sheets,
): Promise<Record<string, unknown>[]> {
  const { headers, rows } = await readAllRows(spreadsheetId, sheetName, sheets);
  return rows
    .filter((r) => r.data['user_id'] === userId)
    .map((r) => decodeRow(headers, r.data));
}

export async function createRow(
  spreadsheetId: string,
  sheetName: string,
  userId: string,
  fields: Record<string, unknown>,
  sheets: sheets_v4.Sheets,
): Promise<Record<string, unknown>> {
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown sheet: ${sheetName}`);

  return withSheetLock(spreadsheetId, sheetName, async () => {
    await ensureSheetsInitialized(spreadsheetId, sheets);

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
    await withGoogleRetry(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${sheetName}'!A:A`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] },
      }),
    );

    const result: Record<string, unknown> = {};
    for (const h of headers) result[h] = full[h];
    return result;
  });
}

export async function updateRow(
  spreadsheetId: string,
  sheetName: string,
  id: string,
  userId: string,
  updates: Record<string, unknown>,
  sheets: sheets_v4.Sheets,
): Promise<Record<string, unknown> | null> {
  return withSheetLock(spreadsheetId, sheetName, async () => {
    const { headers, rows } = await readAllRows(spreadsheetId, sheetName, sheets);
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
    await withGoogleRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${sheetName}'!A${target.sheetRow}:${columnLetter(headers.length)}${target.sheetRow}`,
        valueInputOption: 'RAW',
        requestBody: { values: [row] },
      }),
    );

    const result: Record<string, unknown> = {};
    for (const h of headers) result[h] = merged[h];
    return result;
  });
}

export async function deleteRow(
  spreadsheetId: string,
  sheetName: string,
  id: string,
  userId: string,
  sheets: sheets_v4.Sheets,
): Promise<boolean> {
  return withSheetLock(spreadsheetId, sheetName, async () => {
    const { rows } = await readAllRows(spreadsheetId, sheetName, sheets);
    const target = rows.find((r) => r.data['id'] === id && r.data['user_id'] === userId);
    if (!target) return false;

    // Archive first so data is never permanently lost
    try {
      await archiveDeletedRow(spreadsheetId, sheetName, target.data, sheets);
    } catch (archiveErr) {
      logger.warn(
        { archiveErr, spreadsheetId, sheetName, id },
        '[sheet-store] Failed to archive row before delete; proceeding anyway',
      );
    }

    const meta = await withGoogleRetry(() => sheets.spreadsheets.get({ spreadsheetId }));
    const sheetId = meta.data.sheets?.find(
      (s) => s.properties?.title === sheetName,
    )?.properties?.sheetId;
    if (sheetId === undefined || sheetId === null) throw new Error(`Sheet tab not found: ${sheetName}`);

    await withGoogleRetry(() =>
      sheets.spreadsheets.batchUpdate({
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
      }),
    );

    return true;
  });
}
