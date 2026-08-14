import crypto from 'crypto';
import { postgresRepository } from './postgres-repository.js';
import type { LimitedFreeEntity } from './plan-limits.js';

export type DataEntity = 'notes' | 'transactions' | 'todos' | 'links';

/** PostgreSQL adalah satu-satunya sumber data. */

/** Always true — PostgreSQL is the only data store. */
export function usesPostgresDataStore(): boolean {
  return true;
}

/** Always true — PostgreSQL is the only data store. */
export function usesPostgresDataStoreForUser(_userId: string): boolean {
  return true;
}

export async function listData(
  entity: DataEntity,
  userId: string,
): Promise<Record<string, unknown>[]> {
  return postgresRepository.listByUser(entity, userId);
}

export async function createData(
  entity: DataEntity,
  userId: string,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return postgresRepository.create(entity, userId, crypto.randomUUID(), fields);
}

export async function createLimitedData(
  entity: LimitedFreeEntity,
  userId: string,
  fields: Record<string, unknown>,
  limit: number,
): Promise<Record<string, unknown>> {
  return postgresRepository.createWithFreePlanLimit(entity, userId, crypto.randomUUID(), fields, limit);
}

export async function updateData(
  entity: DataEntity,
  id: string,
  userId: string,
  fields: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  return postgresRepository.update(entity, id, userId, fields);
}

export async function deleteData(
  entity: DataEntity,
  id: string,
  userId: string,
): Promise<boolean> {
  return postgresRepository.remove(entity, id, userId);
}

export async function reorderNotes(
  userId: string,
  orderedIds: string[],
): Promise<void> {
  return postgresRepository.reorderNotes(userId, orderedIds);
}
