import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import {
  db,
  linksTable,
  notesTable,
  todosTable,
  transactionsTable,
  type Link,
  type NewLink,
  type NewNote,
  type NewTodo,
  type NewTransaction,
  type Note,
  type Todo,
  type Transaction,
} from '@workspace/db';
import { normalizeNoteTitle } from './note-fields.js';
import { normalizeStoredNullableText, nullableText } from './nullable-fields.js';

type Entity = 'notes' | 'transactions' | 'todos' | 'links';
type AppRow = Note | Transaction | Todo | Link;
type NewRow = NewNote | NewTransaction | NewTodo | NewLink;

const tables = {
  notes: notesTable,
  transactions: transactionsTable,
  todos: todosTable,
  links: linksTable,
} as const;

type RepositoryDb = typeof db;

function tableFor(entity: Entity) {
  return tables[entity];
}

function toApiRow(row: AppRow, entity: Entity): Record<string, unknown> {
  const source = row as Record<string, unknown>;
  const nullableFields = entity === 'notes'
    ? ['content', 'color']
    : entity === 'transactions'
      ? ['category', 'source', 'note']
      : entity === 'todos'
        ? ['description', 'dueTime']
        : ['note'];

  return Object.fromEntries(Object.entries(source).map(([key, value]) => {
    const apiKey = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    const normalizedValue = entity === 'notes' && key === 'title'
      ? normalizeNoteTitle(value)
      : nullableFields.includes(key)
        ? normalizeStoredNullableText(value)
        : value;
    return [apiKey, normalizedValue instanceof Date ? normalizedValue.toISOString() : normalizedValue];
  }));
}

function fromApiFields(entity: Entity, fields: Record<string, unknown>): Record<string, unknown> {
  if (entity === 'notes') {
    return {
      ...(fields.title !== undefined ? { title: normalizeNoteTitle(fields.title) } : {}),
      ...(fields.content !== undefined ? { content: nullableText(fields.content) } : {}),
      ...(fields.tags !== undefined ? { tags: fields.tags } : {}),
      ...(fields.position !== undefined ? { position: nullableText(fields.position) } : {}),
      ...(fields.color !== undefined ? { color: fields.color === null ? null : String(fields.color) } : {}),
    };
  }
  if (entity === 'transactions') {
    return {
      ...(fields.type !== undefined ? { type: fields.type } : {}),
      ...(fields.amount !== undefined ? { amount: String(fields.amount) } : {}),
      ...(fields.category !== undefined ? { category: nullableText(fields.category) } : {}),
      ...(fields.source !== undefined ? { source: nullableText(fields.source) } : {}),
      ...(fields.note !== undefined ? { note: nullableText(fields.note) } : {}),
      ...(fields.date !== undefined ? { date: new Date(String(fields.date)) } : {}),
    };
  }
  if (entity === 'todos') {
    return {
      ...(fields.title !== undefined ? { title: String(fields.title) } : {}),
      ...(fields.description !== undefined ? { description: nullableText(fields.description) } : {}),
      ...(fields.due_date !== undefined ? { dueDate: fields.due_date ? new Date(String(fields.due_date)) : null } : {}),
      ...(fields.due_time !== undefined ? { dueTime: nullableText(fields.due_time) } : {}),
      ...(fields.is_done !== undefined ? { isDone: Boolean(fields.is_done) } : {}),
    };
  }
  return {
    ...(fields.title !== undefined ? { title: String(fields.title) } : {}),
    ...(fields.url !== undefined ? { url: String(fields.url) } : {}),
    ...(fields.note !== undefined ? { note: nullableText(fields.note) } : {}),
  };
}

function now() {
  return new Date();
}

export function createPostgresRepository(database: RepositoryDb = db) {
  return {
    async listByUser(entity: Entity, userId: string): Promise<Record<string, unknown>[]> {
      const table = tableFor(entity);
      const rows = await database
        .select()
        .from(table)
        .where(and(eq(table.userId, userId), isNull(table.deletedAt)))
        .orderBy(desc(table.updatedAt), asc(table.id));
      return (rows as unknown as AppRow[]).map((row) => toApiRow(row, entity));
    },

    async getById(entity: Entity, id: string, userId: string): Promise<Record<string, unknown> | null> {
      const table = tableFor(entity);
      const rows = await database
        .select()
        .from(table)
        .where(and(eq(table.id, id), eq(table.userId, userId), isNull(table.deletedAt)))
        .limit(1);
      return rows[0] ? toApiRow(rows[0] as AppRow, entity) : null;
    },

    async create(
      entity: Entity,
      userId: string,
      id: string,
      fields: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      const table = tableFor(entity);
      const timestamp = now();
      const values = {
        id,
        userId,
        ...fromApiFields(entity, fields),
        createdAt: timestamp,
        updatedAt: timestamp,
      } as NewRow;
      const rows = await database.insert(table).values(values as never).returning();
      return toApiRow(rows[0] as AppRow, entity);
    },

    async update(
      entity: Entity,
      id: string,
      userId: string,
      fields: Record<string, unknown>,
    ): Promise<Record<string, unknown> | null> {
      const table = tableFor(entity);
      const rows = await database
        .update(table)
        .set({ ...fromApiFields(entity, fields), updatedAt: now() } as never)
        .where(and(eq(table.id, id), eq(table.userId, userId), isNull(table.deletedAt)))
        .returning();
      return rows[0] ? toApiRow(rows[0] as AppRow, entity) : null;
    },

    async remove(entity: Entity, id: string, userId: string): Promise<boolean> {
      const table = tableFor(entity);
      const rows = await database
        .update(table)
        .set({ deletedAt: now(), updatedAt: now() } as never)
        .where(and(eq(table.id, id), eq(table.userId, userId), isNull(table.deletedAt)))
        .returning({ id: table.id });
      return rows.length > 0;
    },

    async reorderNotes(userId: string, orderedIds: string[]): Promise<void> {
      const basePosition = 1_000_000_000;
      for (const [index, id] of orderedIds.entries()) {
        await database
          .update(notesTable)
          .set({ position: String(basePosition - index), updatedAt: now() })
          .where(and(eq(notesTable.id, id), eq(notesTable.userId, userId), isNull(notesTable.deletedAt)));
      }
    },

    async transactionSummary(userId: string, startDate?: string, endDate?: string) {
      const predicates = [eq(transactionsTable.userId, userId), isNull(transactionsTable.deletedAt)];
      if (startDate) predicates.push(sql`${transactionsTable.date} >= ${new Date(`${startDate}T00:00:00.000Z`)}`);
      if (endDate) predicates.push(sql`${transactionsTable.date} < ${new Date(`${endDate}T00:00:00.000Z`)}`);
      const rows = await database
        .select({
          type: transactionsTable.type,
          total: sql<string>`coalesce(sum(${transactionsTable.amount}), 0)`,
          count: sql<number>`count(*)`,
        })
        .from(transactionsTable)
        .where(and(...predicates));
      return rows;
    },
  };
}

export const postgresRepository = createPostgresRepository();
export type PostgresRepository = ReturnType<typeof createPostgresRepository>;