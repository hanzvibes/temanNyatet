import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatIDR } from '@/lib/format';

test('formatIDR formats thousands with id-ID grouping', () => {
  assert.equal(formatIDR(100000), 'Rp 100.000');
});

test('formatIDR formats the yearly Pro price', () => {
  assert.equal(formatIDR(249000), 'Rp 249.000');
});

test('formatIDR handles zero', () => {
  assert.equal(formatIDR(0), 'Rp 0');
});

test('formatIDR handles millions', () => {
  assert.equal(formatIDR(2482000), 'Rp 2.482.000');
});

test('formatIDR does not emit decimals', () => {
  assert.equal(formatIDR(20750), 'Rp 20.750');
});
