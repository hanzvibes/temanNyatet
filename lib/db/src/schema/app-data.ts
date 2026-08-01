import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};

export const transactionType = pgEnum("transaction_type", ["income", "expense"]);
export const syncEntityType = pgEnum("sync_entity_type", [
  "notes",
  "transactions",
  "todos",
  "links",
]);
export const syncOperation = pgEnum("sync_operation", ["upsert", "delete"]);
export const syncStatus = pgEnum("sync_status", ["pending", "processing", "succeeded", "failed"]);

export const notesTable = pgTable(
  "notes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default(""),
    content: text("content").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    position: numeric("position", { precision: 20, scale: 0 }),
    color: text("color"),
    ...timestamps,
  },
  (table) => [index("notes_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const transactionsTable = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    type: transactionType("type").notNull(),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    category: text("category").notNull().default(""),
    source: text("source").notNull().default(""),
    note: text("note").notNull().default(""),
    date: timestamp("date", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("transactions_user_date_idx").on(table.userId, table.date),
    index("transactions_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const todosTable = pgTable(
  "todos",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default(""),
    description: text("description").notNull().default(""),
    dueDate: timestamp("due_date", { withTimezone: true }),
    dueTime: text("due_time"),
    isDone: boolean("is_done").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    index("todos_user_done_idx").on(table.userId, table.isDone),
    index("todos_user_updated_idx").on(table.userId, table.updatedAt),
  ],
);

export const linksTable = pgTable(
  "links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    title: text("title").notNull().default(""),
    url: text("url").notNull(),
    note: text("note").notNull().default(""),
    ...timestamps,
  },
  (table) => [index("links_user_updated_idx").on(table.userId, table.updatedAt)],
);

export const syncOutboxTable = pgTable(
  "sync_outbox",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    entityType: syncEntityType("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    operation: syncOperation("operation").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: syncStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  },
  (table) => [
    uniqueIndex("sync_outbox_event_idx").on(
      table.userId,
      table.entityType,
      table.entityId,
      table.updatedAt,
    ),
    index("sync_outbox_pending_idx").on(table.status, table.createdAt),
  ],
);

export type Note = typeof notesTable.$inferSelect;
export type NewNote = typeof notesTable.$inferInsert;
export type Transaction = typeof transactionsTable.$inferSelect;
export type NewTransaction = typeof transactionsTable.$inferInsert;
export type Todo = typeof todosTable.$inferSelect;
export type NewTodo = typeof todosTable.$inferInsert;
export type Link = typeof linksTable.$inferSelect;
export type NewLink = typeof linksTable.$inferInsert;
export type SyncOutboxEvent = typeof syncOutboxTable.$inferSelect;
export type NewSyncOutboxEvent = typeof syncOutboxTable.$inferInsert;