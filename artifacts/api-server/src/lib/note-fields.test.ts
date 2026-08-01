import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeNoteTitle } from './note-fields.js';

test('empty note titles never become the literal string null', () => {
  assert.equal(normalizeNoteTitle(null), '');
  assert.equal(normalizeNoteTitle(undefined), '');
  assert.equal(normalizeNoteTitle(''), '');
  assert.equal(normalizeNoteTitle('   '), '');
});

test('preserves a non-empty note title', () => {
  assert.equal(normalizeNoteTitle('Belanja bulanan'), 'Belanja bulanan');
});