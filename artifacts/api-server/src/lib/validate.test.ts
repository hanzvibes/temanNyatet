import assert from 'node:assert/strict';
import test from 'node:test';
import {
  requireCalendarDate,
  requireNonEmptyUpdates,
  requireValidDateTime,
} from './validate.js';

test('accepts valid calendar dates and rejects impossible dates', () => {
  assert.equal(requireCalendarDate('2026-07-29', 'due_date'), '2026-07-29');
  assert.throws(() => requireCalendarDate('2026-02-30', 'due_date'), /valid calendar date/i);
  assert.throws(() => requireCalendarDate('2026/07/29', 'due_date'), /YYYY-MM-DD/i);
});

test('accepts valid transaction date values and rejects invalid values', () => {
  assert.equal(requireValidDateTime('2026-07-29', 'date'), '2026-07-29');
  assert.equal(requireValidDateTime('2026-07-29T12:30:00.000Z', 'date'), '2026-07-29T12:30:00.000Z');
  assert.throws(() => requireValidDateTime('not-a-date', 'date'), /valid date/i);
});

test('rejects empty update payloads', () => {
  assert.throws(() => requireNonEmptyUpdates({}, 'updates'), /at least one field/i);
  assert.deepEqual(requireNonEmptyUpdates({ title: 'Updated' }, 'updates'), { title: 'Updated' });
});