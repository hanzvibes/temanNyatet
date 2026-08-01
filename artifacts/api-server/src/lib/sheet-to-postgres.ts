import type { sheets_v4 } from 'googleapis';
import {
  db,
  linksTable,
  notesTable,
  todosTable,
  transactionsTable,
} from '@workspace/db';
import { SHEET_SCHEMAS } from './sheet-store.js';

type MigrationDb = typeof db;

export type SheetMigrationResult = {
  imported: number;
  skipped: number;
  invalid: number;
  errors: Array<{ sheet: string; row: number; reason: string }>;
};

function value(row: string[], headers: string[], key: string): string {
  const index = headers.indexOf(key);
  return index >= 0 ? String(row[index] ?? '') : '';
}

function parseTags(raw: string): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : [];
  } catch {
    return raw.split(',').map((tag) => tag.trim()).filter(Boolean);
  }
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function requiredDate(raw: string, field: string): Date {
  const date = parseDate(raw);
  if (!date) throw new Error(`${field} is not a valid date`);
  return date;
}

async function readTab(
  spreadsheetId: string,
  sheetName: string,
  sheets: sheets_v4.Sheets,
): Promise<{ headers: string[]; rows: string[][] }> {
  const headers = SHEET_SCHEMAS[sheetName];
  if (!headers) throw new Error(`Unknown sheet schema: ${sheetName}`);
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${sheetName}'!A1:${String.fromCharCode(64 + headers.length)}`,
  });
  const values = (response.data.values ?? []) as string[][];
  return { headers: values[0] ?? headers, rows: values.slice(1) };
}

function nowOrDate(raw: string): Date {
  return parseDate(raw) ?? new Date();
}

export async function migrateSpreadsheet(
  input: {
    userId: string;
    spreadsheetId: string;
    sheets: sheets_v4.Sheets;
  },
  database: MigrationDb = db,
): Promise<SheetMigrationResult> {
  const result: SheetMigrationResult = { imported: 0, skipped: 0, invalid: 0, errors: [] };
  const tabs = [
    ['📝 Notes', notesTable],
    ['💰 Transactions', transactionsTable],
    ['✅ Todos', todosTable],
    ['🔗 Links', linksTable],
  ] as const;

  for (const [sheetName, table] of tabs) {
    const { headers, rows } = await readTab(input.spreadsheetId, sheetName, input.sheets);
    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const id = value(row, headers, 'id');
      if (!id) {
        result.skipped += 1;
        continue;
      }

      try {
        const createdAt = nowOrDate(value(row, headers, 'created_at'));
        const updatedAt = nowOrDate(value(row, headers, 'updated_at') || value(row, headers, 'created_at'));
        let insert: Record<string, unknown>;

        if (sheetName === '📝 Notes') {
          insert = {
            id,
            userId: input.userId,
            title: value(row, headers, 'title'),
            content: value(row, headers, 'content'),
            tags: parseTags(value(row, headers, 'tags')),
            position: value(row, headers, 'position') || null,
            color: value(row, headers, 'color') || null,
            createdAt,
            updatedAt,
          };
        } else if (sheetName === '💰 Transactions') {
          const type = value(row, headers, 'type');
          if (type !== 'income' && type !== 'expense') throw new Error('type must be income or expense');
          insert = {
            id,
            userId: input.userId,
            type,
            amount: value(row, headers, 'amount'),
            category: value(row, headers, 'category'),
            source: value(row, headers, 'source'),
            note: value(row, headers, 'note'),
            date: requiredDate(value(row, headers, 'date'), 'date'),
            createdAt,
            updatedAt,
          };
        } else if (sheetName === '✅ Todos') {
          insert = {
            id,
            userId: input.userId,
            title: value(row, headers, 'title'),
            description: value(row, headers, 'description'),
            dueDate: parseDate(value(row, headers, 'due_date')),
            dueTime: value(row, headers, 'due_time') || null,
            isDone: value(row, headers, 'is_done') === 'true',
            createdAt,
            updatedAt,
          };
        } else {
          const url = value(row, headers, 'url');
          if (!url) throw new Error('url is required');
          insert = {
            id,
            userId: input.userId,
            title: value(row, headers, 'title'),
            url,
            note: value(row, headers, 'note'),
            createdAt,
            updatedAt,
          };
        }

        await database
          .insert(table)
          .values(insert as never)
          .onConflictDoUpdate({
            target: table.id,
            set: { ...insert, userId: input.userId, updatedAt },
          } as never);
        result.imported += 1;
      } catch (error) {
        result.invalid += 1;
        result.errors.push({
          sheet: sheetName,
          row: rowNumber,
          reason: error instanceof Error ? error.message : 'Unknown row error',
        });
      }
    }
  }

  return result;
}