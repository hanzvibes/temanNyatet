import assert from 'node:assert/strict';
import test from 'node:test';
import { AI_SUMMARY_COPY } from './ai-summary-copy.js';

test('shared AI summary copy includes every user-facing feature detail', () => {
  const copy = JSON.stringify(AI_SUMMARY_COPY);

  assert.match(copy, /Ringkasan catatan/);
  assert.match(copy, /transaksi keuangan/);
  assert.match(copy, /1 credit/);
  assert.match(copy, /Minggu Ini/);
  assert.match(copy, /Bulan Ini/);
  assert.match(copy, /Custom Range/);
  assert.match(copy, /pemasukan/);
  assert.match(copy, /pengeluaran/);
  assert.match(copy, /top 3 kategori/);
  assert.match(copy, /perbandingan periode/);
  assert.match(copy, /insight/);
  assert.match(copy, /data agregat/);
  assert.match(copy, /bukan nasihat keuangan/);
});