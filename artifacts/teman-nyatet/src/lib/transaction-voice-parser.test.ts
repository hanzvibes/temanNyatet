import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeParsedTransactionVoice,
  parseTransactionVoiceTranscript,
} from './transaction-voice-parser.js';
import { createTransactionFormDefaults } from './transactions.js';

const NOW = new Date(2026, 7, 5, 12);

test('maps an Indonesian expense voice command into transaction fields', () => {
  assert.deepEqual(
    parseTransactionVoiceTranscript(
      'Pengeluaran lima puluh ribu untuk makan siang pakai QRIS',
      NOW,
    ),
    {
      type: 'expense',
      amount: '50.000',
      category: 'Makanan',
      note: 'Makan siang',
      source: 'QRIS',
      date: undefined,
    },
  );
});

test('supports income, numeric amounts, relative dates, and bank sources', () => {
  assert.deepEqual(
    parseTransactionVoiceTranscript('Pemasukan Rp 1.500.000 dari gaji tanggal 3 Agustus pakai BCA', NOW),
    {
      type: 'income',
      amount: '1.500.000',
      category: 'Gaji',
      note: 'Dari gaji',
      source: 'BCA',
      date: '2026-08-03',
    },
  );
  assert.equal(
    parseTransactionVoiceTranscript('bayar tagihan listrik lima puluh ribu kemarin', NOW).date,
    '2026-08-04',
  );
  assert.equal(
    parseTransactionVoiceTranscript('pengeluaran tanggal 3 Agustus', NOW).amount,
    undefined,
  );
  assert.equal(
    parseTransactionVoiceTranscript('pengeluaran seratus lima puluh ribu untuk belanja', NOW).amount,
    '150.000',
  );
});

test('leaves undetected values available for manual entry', () => {
  const current = createTransactionFormDefaults('expense');
  const merged = mergeParsedTransactionVoice(current, {
    category: 'Makanan',
    note: 'Sarapan',
  });

  assert.equal(merged.category, 'Makanan');
  assert.equal(merged.note, 'Sarapan');
  assert.equal(merged.amount, '');
  assert.equal(merged.source, 'Cash');
  assert.equal(merged.date, current.date);
});