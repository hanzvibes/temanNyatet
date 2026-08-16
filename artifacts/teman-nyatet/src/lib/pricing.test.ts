import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getPriceLabel } from '@/lib/pricing';

test('free tier is always Rp 0 · selamanya, regardless of billing', () => {
  assert.deepEqual(
    getPriceLabel({ isPro: false, price: 0, yearly: 0, annual: false }),
    { amount: 'Rp 0', period: 'selamanya' },
  );
  assert.deepEqual(
    getPriceLabel({ isPro: false, price: 0, yearly: 0, annual: true }),
    { amount: 'Rp 0', period: 'selamanya' },
  );
});

test('pro monthly shows the monthly price', () => {
  assert.deepEqual(
    getPriceLabel({ isPro: true, price: 100000, yearly: 249000, annual: false }),
    { amount: 'Rp 100.000', period: '/ bulan' },
  );
});

test('pro annual shows the discounted yearly price', () => {
  assert.deepEqual(
    getPriceLabel({ isPro: true, price: 100000, yearly: 249000, annual: true }),
    { amount: 'Rp 249.000', period: '/ tahun' },
  );
});

test('switching billing only changes the Pro tier', () => {
  const free = getPriceLabel({ isPro: false, price: 0, yearly: 0, annual: false });
  const freeAnnual = getPriceLabel({ isPro: false, price: 0, yearly: 0, annual: true });
  assert.deepEqual(free, freeAnnual);
});
