import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeStoredNullableText, nullableText, requiredStoredText } from './nullable-fields.js';

test('nullableText keeps nullish values null instead of rendering them as "null"', () => {
  assert.equal(nullableText(null), null);
  assert.equal(nullableText(undefined), null);
  assert.equal(nullableText(''), '');
  assert.equal(nullableText('  '), '  ');
});

test('nullableText converts non-null values to text', () => {
  assert.equal(nullableText('Catatan'), 'Catatan');
  assert.equal(nullableText(123), '123');
  assert.equal(nullableText(false), 'false');
});

test('normalizeStoredNullableText hides legacy literal null values', () => {
  assert.equal(normalizeStoredNullableText('null'), null);
  assert.equal(normalizeStoredNullableText(null), null);
  assert.equal(normalizeStoredNullableText(''), null);
  assert.equal(normalizeStoredNullableText('Catatan'), 'Catatan');
});

test('requiredStoredText protects PostgreSQL non-null text columns', () => {
  assert.equal(requiredStoredText(null), '');
  assert.equal(requiredStoredText(undefined), '');
  assert.equal(requiredStoredText('Catatan'), 'Catatan');
});