import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import { and, eq } from 'drizzle-orm';
import {
  db,
  linksTable,
  notesTable,
  pool,
  todosTable,
  transactionsTable,
} from '@workspace/db';
import { createPostgresRepository } from './postgres-repository.js';

test.after(async () => {
  await pool.end();
});

test('PostgreSQL CRUD preserves ownership, dates, nulls, and soft deletes', async () => {
  const repository = createPostgresRepository();
  const userId = `postgres-regression-${randomUUID()}`;
  const otherUserId = `postgres-regression-other-${randomUUID()}`;
  const ids = {
    note: `note-${randomUUID()}`,
    otherNote: `other-note-${randomUUID()}`,
    transaction: `transaction-${randomUUID()}`,
    todo: `todo-${randomUUID()}`,
    link: `link-${randomUUID()}`,
  };

  try {
    const createdNote = await repository.create('notes', userId, ids.note, {
      title: '  Catatan migrasi  ',
      content: 'Isi catatan',
      tags: ['audit'],
      position: 10,
      color: null,
    });
    assert.equal(createdNote.title, 'Catatan migrasi');
    assert.equal(createdNote.position, 10);
    assert.equal(createdNote.color, null);
    assert.equal((await repository.listByUser('notes', otherUserId)).length, 0);
    assert.equal(await repository.update('notes', ids.note, otherUserId, { title: 'Tidak boleh' }), null);

    const updatedNote = await repository.update('notes', ids.note, userId, { title: 'Catatan diperbarui' });
    assert.equal(updatedNote?.title, 'Catatan diperbarui');

    await repository.create('notes', otherUserId, ids.otherNote, {
      title: 'Catatan user lain',
      content: 'Tidak boleh ikut reorder',
      position: 20,
    });
    await repository.reorderNotes(userId, [ids.note, ids.otherNote]);
    assert.equal((await repository.getById('notes', ids.note, userId))?.position, 1_000_000_000);
    assert.equal((await repository.getById('notes', ids.otherNote, otherUserId))?.position, 20);

    const createdTransaction = await repository.create('transactions', userId, ids.transaction, {
      type: 'expense',
      amount: 123.45,
      category: 'Makanan',
      source: 'Cash',
      note: null,
      date: '2026-07-29',
    });
    assert.equal(createdTransaction.amount, 123.45);
    assert.equal(createdTransaction.note, null);
    assert.match(String(createdTransaction.date), /^2026-07-29T00:00:00\.000Z$/);

    const createdTodo = await repository.create('todos', userId, ids.todo, {
      title: 'Todo migrasi',
      description: null,
      due_date: '2026-07-29',
      due_time: null,
      is_done: 'false',
    });
    assert.equal(createdTodo.description, null);
    assert.equal(createdTodo.due_date, '2026-07-29');
    assert.equal(createdTodo.is_done, false);

    const createdLink = await repository.create('links', userId, ids.link, {
      title: 'Dokumentasi',
      url: 'https://example.com/docs',
      note: null,
    });
    assert.equal(createdLink.note, null);

    assert.equal(await repository.remove('notes', ids.note, otherUserId), false);
    assert.equal(await repository.remove('notes', ids.note, userId), true);
    assert.equal(await repository.getById('notes', ids.note, userId), null);
    assert.equal((await repository.listByUser('notes', userId)).some((row) => row.id === ids.note), false);

    assert.equal(await repository.remove('transactions', ids.transaction, userId), true);
    assert.equal(await repository.remove('todos', ids.todo, userId), true);
    assert.equal(await repository.remove('links', ids.link, userId), true);
  } finally {
    await db.delete(notesTable).where(eq(notesTable.userId, userId));
    await db.delete(transactionsTable).where(eq(transactionsTable.userId, userId));
    await db.delete(todosTable).where(eq(todosTable.userId, userId));
    await db.delete(linksTable).where(eq(linksTable.userId, userId));
    await db.delete(notesTable).where(eq(notesTable.userId, otherUserId));
    await db.delete(transactionsTable).where(eq(transactionsTable.userId, otherUserId));
    await db.delete(todosTable).where(eq(todosTable.userId, otherUserId));
    await db.delete(linksTable).where(eq(linksTable.userId, otherUserId));
  }
});