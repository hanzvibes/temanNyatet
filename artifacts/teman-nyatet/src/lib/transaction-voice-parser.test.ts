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

test('parses the amount after the description, including spaced speech units', () => {
  const expected = {
    type: 'expense' as const,
    amount: '20.000',
    category: 'Makanan',
    note: 'Kopi',
    source: undefined,
    date: undefined,
  };

  assert.deepEqual(parseTransactionVoiceTranscript('beli Kopi 20rb', NOW), expected);
  assert.deepEqual(parseTransactionVoiceTranscript('20rb beli kopi', NOW), expected);
  assert.deepEqual(parseTransactionVoiceTranscript('beli Kopi 20 rb', NOW), expected);
  assert.deepEqual(parseTransactionVoiceTranscript('beli Kopi 20 ribu', NOW), expected);
  assert.deepEqual(parseTransactionVoiceTranscript('beli kopi, seharga 20rb.', NOW), expected);
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