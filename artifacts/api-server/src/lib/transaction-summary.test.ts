import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateTransactions,
  resolveSummaryPeriod,
  validateSummaryOutput,
} from './transaction-summary.js';

const rows = [
  { id: '1', type: 'income', amount: 1_000_000, category: 'Gaji', date: '2026-07-03' },
  { id: '2', type: 'expense', amount: 300_000, category: 'Makanan', date: '2026-07-04' },
  { id: '3', type: 'expense', amount: 200_000, category: 'Transportasi', date: '2026-07-05' },
  { id: '4', type: 'expense', amount: 100_000, category: 'Makanan', date: '2026-06-28' },
  { id: '5', type: 'income', amount: 500_000, category: 'Freelance', date: '2026-06-28' },
] as const;

test('resolves a week and its previous same-duration week', () => {
  const period = resolveSummaryPeriod({
    periodType: 'week',
    startDate: '2026-07-06',
    endDate: '2026-07-12',
  });

  assert.deepEqual(
    {
      startDate: period.startDate,
      endDate: period.endDate,
      comparisonStartDate: period.comparisonStartDate,
      comparisonEndDate: period.comparisonEndDate,
    },
    {
      startDate: '2026-07-06',
      endDate: '2026-07-12',
      comparisonStartDate: '2026-06-29',
      comparisonEndDate: '2026-07-05',
    },
  );
});

test('resolves month comparison using the previous calendar month', () => {
  const period = resolveSummaryPeriod({
    periodType: 'month',
    startDate: '2026-07-01',
    endDate: '2026-07-31',
  });

  assert.equal(period.comparisonStartDate, '2026-06-01');
  assert.equal(period.comparisonEndDate, '2026-06-30');
});

test('aggregates totals, top expense categories, and percentage changes', () => {
  const period = resolveSummaryPeriod({
    periodType: 'custom',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
  });
  const aggregate = aggregateTransactions(rows, period);

  assert.equal(aggregate.current.income, 1_000_000);
  assert.equal(aggregate.current.expense, 500_000);
  assert.deepEqual(aggregate.current.topExpenseCategories, [
    { category: 'Makanan', amount: 300_000, percentage: 60 },
    { category: 'Transportasi', amount: 200_000, percentage: 40 },
  ]);
  assert.equal(aggregate.comparison.incomeChangePercent, 100);
  assert.equal(aggregate.comparison.expenseChangePercent, 400);
});

test('returns null change when the comparison baseline is zero', () => {
  const period = resolveSummaryPeriod({
    periodType: 'custom',
    startDate: '2026-07-01',
    endDate: '2026-07-05',
  });
  const aggregate = aggregateTransactions(rows.slice(0, 3), period);

  assert.equal(aggregate.comparison.incomeChangePercent, null);
  assert.equal(aggregate.comparison.expenseChangePercent, null);
});

test('rejects fabricated or malformed AI output', () => {
  assert.throws(() => validateSummaryOutput({
    headline: 'Ringkasan',
    totals: { income: 1, expense: 2 },
    top_expense_categories: [],
    comparison: {
      income_change_percent: null,
      expense_change_percent: null,
      direction: 'up',
    },
    insights: ['satu', 'dua', 'tiga'],
  }), /insights/i);
});