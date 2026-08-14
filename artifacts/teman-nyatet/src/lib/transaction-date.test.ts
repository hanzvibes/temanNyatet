import assert from 'node:assert/strict';
import test from 'node:test';
import { transactionDateValue } from './transaction-date.js';

test('normalizes a PostgreSQL ISO timestamp for period filtering', () => {
  const date = transactionDateValue('2026-07-29T00:00:00.000Z');

  assert.equal(Number.isNaN(date.getTime()), false);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 6);
  assert.equal(date.getDate(), 29);
});

test('normalizes a date-only value', () => {
  const date = transactionDateValue('2026-07-29');

  assert.equal(Number.isNaN(date.getTime()), false);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 6);
  assert.equal(date.getDate(), 29);
});