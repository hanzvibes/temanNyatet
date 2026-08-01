import assert from 'node:assert/strict';
import test from 'node:test';
import {
  coerceApiBoolean,
  parseApiDateTime,
  serializeTodoDate,
} from './postgres-fields.js';

test('serializes PostgreSQL todo timestamps as calendar dates', () => {
  assert.equal(serializeTodoDate(new Date('2026-07-29T00:00:00.000Z')), '2026-07-29');
  assert.equal(serializeTodoDate('2026-07-29'), '2026-07-29');
  assert.equal(serializeTodoDate(null), null);
});

test('does not coerce the string false to boolean true', () => {
  assert.equal(coerceApiBoolean(false), false);
  assert.equal(coerceApiBoolean('false'), false);
  assert.equal(coerceApiBoolean(' false '), false);
  assert.equal(coerceApiBoolean('true'), true);
  assert.equal(coerceApiBoolean('yes'), false);
  assert.equal(coerceApiBoolean('0'), false);
});

test('rejects invalid transaction date values before PostgreSQL persistence', () => {
  assert.equal(parseApiDateTime('2026-07-29').toISOString(), '2026-07-29T00:00:00.000Z');
  assert.throws(() => parseApiDateTime('not-a-date'), /valid date/i);
});