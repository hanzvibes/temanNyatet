import { newId } from './google-sheets.js';
import {
  createRow as createSheetRow,
  deleteRow as deleteSheetRow,
  listByUser as listSheetRows,
  updateRow as updateSheetRow,
} from './sheet-store.js';
import { postgresRepository } from './postgres-repository.js';

export type DataEntity = 'notes' | 'transactions' | 'todos' | 'links';
export type DataStoreMode = 'sheets' | 'postgres';

const mode = (process.env.APP_DATA_STORE ?? 'sheets') as string;
if (mode !== 'sheets' && mode !== 'postgres') {
  throw new Error(`APP_DATA_STORE must be "sheets" or "postgres", received "${mode}"`);
}

export const dataStoreMode: DataStoreMode = mode;

const postgresUserAllowlist = new Set(
  (process.env.APP_DATA_POSTGRES_USER_IDS ?? '')
    .split(',')
    .map((userId) => userId.trim())
    .filter(Boolean),
);

const SHEETS: Record<DataEntity, string> = {
  notes: '📝 Notes',
  transactions: '💰 Transactions',
  todos: '✅ Todos',
  links: '🔗 Links',
};

export function usesPostgresDataStore(): boolean {
  return dataStoreMode === 'postgres';
}

export function usesPostgresDataStoreForUser(userId: string): boolean {
  return dataStoreMode === 'postgres' && (
    postgresUserAllowlist.size === 0 || postgresUserAllowlist.has(userId)
  );
}

export async function listData(
  entity: DataEntity,
  userId: string,
  spreadsheetId?: string,
  sheetsClient?: Parameters<typeof listSheetRows>[3],
) {
  if (usesPostgresDataStoreForUser(userId)) return postgresRepository.listByUser(entity, userId);
  if (!spreadsheetId || !sheetsClient) throw new Error('Google Sheets connection is required');
  return listSheetRows(spreadsheetId, SHEETS[entity], userId, sheetsClient);
}

export async function createData(
  entity: DataEntity,
  userId: string,
  fields: Record<string, unknown>,
  spreadsheetId?: string,
  sheetsClient?: Parameters<typeof createSheetRow>[4],
) {
  if (usesPostgresDataStoreForUser(userId)) return postgresRepository.create(entity, userId, newId(), fields);
  if (!spreadsheetId || !sheetsClient) throw new Error('Google Sheets connection is required');
  return createSheetRow(spreadsheetId, SHEETS[entity], userId, fields, sheetsClient);
}

export async function updateData(
  entity: DataEntity,
  id: string,
  userId: string,
  fields: Record<string, unknown>,
  spreadsheetId?: string,
  sheetsClient?: Parameters<typeof updateSheetRow>[5],
) {
  if (usesPostgresDataStoreForUser(userId)) return postgresRepository.update(entity, id, userId, fields);
  if (!spreadsheetId || !sheetsClient) throw new Error('Google Sheets connection is required');
  return updateSheetRow(spreadsheetId, SHEETS[entity], id, userId, fields, sheetsClient);
}

export async function deleteData(
  entity: DataEntity,
  id: string,
  userId: string,
  spreadsheetId?: string,
  sheetsClient?: Parameters<typeof deleteSheetRow>[4],
) {
  if (usesPostgresDataStoreForUser(userId)) return postgresRepository.remove(entity, id, userId);
  if (!spreadsheetId || !sheetsClient) throw new Error('Google Sheets connection is required');
  return deleteSheetRow(spreadsheetId, SHEETS[entity], id, userId, sheetsClient);
}

export async function reorderNotes(
  userId: string,
  orderedIds: string[],
  spreadsheetId?: string,
  sheetsClient?: Parameters<typeof listSheetRows>[3],
) {
  if (usesPostgresDataStoreForUser(userId)) return postgresRepository.reorderNotes(userId, orderedIds);
  if (!spreadsheetId || !sheetsClient) throw new Error('Google Sheets connection is required');
  const { reorderRows } = await import('./sheet-store.js');
  return reorderRows(spreadsheetId, SHEETS.notes, userId, orderedIds, sheetsClient);
}