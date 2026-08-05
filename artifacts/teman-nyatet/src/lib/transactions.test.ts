import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  createTransactionFormDefaults,
  formatRupiahCompact,
  getTransactionCategories,
  parseTransactionAmount,
} from './transactions.js';

test('parses Indonesian-formatted transaction amounts', () => {
  assert.equal(parseTransactionAmount('1.250.000'), 1_250_000);
  assert.equal(parseTransactionAmount('Rp 75.500'), 75_500);
  assert.equal(parseTransactionAmount(''), 0);
});

test('selects categories from the transaction type', () => {
  assert.deepEqual(getTransactionCategories('income'), DEFAULT_INCOME_CATEGORIES);
  assert.deepEqual(getTransactionCategories('expense'), DEFAULT_EXPENSE_CATEGORIES);
});

test('creates valid defaults for the shared transaction form', () => {
  const defaults = createTransactionFormDefaults('income');

  assert.equal(defaults.type, 'income');
  assert.equal(defaults.amount, '');
  assert.equal(defaults.source, 'Cash');
  assert.match(defaults.date, /^\d{4}-\d{2}-\d{2}$/);
});

test('uses compact formatting only for million-rupiah values', () => {
  assert.match(formatRupiahCompact(12_500), /12\.500/);
  assert.match(formatRupiahCompact(1_500_000), /1,5\s*jt/i);
});