import { ValidationError } from './validate.js';

export type SummaryPeriodType = 'week' | 'month' | 'custom';

export type SummaryPeriodInput = {
  periodType: SummaryPeriodType;
  startDate: string;
  endDate: string;
};

export type ResolvedSummaryPeriod = {
  periodType: SummaryPeriodType;
  startDate: string;
  endDate: string;
  comparisonStartDate: string;
  comparisonEndDate: string;
  durationDays: number;
};

export type TransactionSummaryRow = {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
};

export type TransactionAggregate = {
  income: number;
  expense: number;
  transactionCount: number;
  topExpenseCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
};

export type AggregatedTransactionSummary = {
  current: TransactionAggregate;
  comparisonPeriod: {
    startDate: string;
    endDate: string;
  };
  comparison: {
    incomeChangePercent: number | null;
    expenseChangePercent: number | null;
    direction: 'up' | 'down' | 'same' | 'unavailable';
  };
};

export type TransactionSummaryOutput = {
  headline: string;
  totals: {
    income: number;
    expense: number;
  };
  top_expense_categories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  comparison: {
    income_change_percent: number | null;
    expense_change_percent: number | null;
    direction: 'up' | 'down' | 'same' | 'unavailable';
  };
  insights: string[];
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_CUSTOM_RANGE_DAYS = 366;
const MAX_HEADLINE_LENGTH = 240;
const MAX_INSIGHT_LENGTH = 320;

function parseDate(value: string, field: string): Date {
  if (!ISO_DATE.test(value)) {
    throw new ValidationError(`${field} must use YYYY-MM-DD format`);
  }
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime()) || toDateString(date) !== value) {
    throw new ValidationError(`${field} must be a valid calendar date`);
  }
  return date;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12));
}

function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12));
}

function daysBetweenInclusive(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
}

export function resolveSummaryPeriod(input: SummaryPeriodInput): ResolvedSummaryPeriod {
  if (!['week', 'month', 'custom'].includes(input.periodType)) {
    throw new ValidationError('period_type must be one of: week, month, custom');
  }

  const start = parseDate(input.startDate, 'start_date');
  const end = parseDate(input.endDate, 'end_date');
  if (end < start) throw new ValidationError('end_date must be on or after start_date');

  const durationDays = daysBetweenInclusive(start, end);
  if (input.periodType === 'custom' && durationDays > MAX_CUSTOM_RANGE_DAYS) {
    throw new ValidationError(`custom range must be ${MAX_CUSTOM_RANGE_DAYS} days or fewer`);
  }

  let normalizedStart = start;
  let normalizedEnd = end;
  if (input.periodType === 'week') {
    const day = start.getUTCDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    normalizedStart = addDays(start, mondayOffset);
    normalizedEnd = addDays(normalizedStart, 6);
  } else if (input.periodType === 'month') {
    normalizedStart = startOfMonth(start);
    normalizedEnd = endOfMonth(start);
  }

  const normalizedDuration = daysBetweenInclusive(normalizedStart, normalizedEnd);
  let comparisonStart: Date;
  let comparisonEnd: Date;
  if (input.periodType === 'month') {
    const previousMonth = new Date(Date.UTC(
      normalizedStart.getUTCFullYear(),
      normalizedStart.getUTCMonth() - 1,
      1,
      12,
    ));
    comparisonStart = startOfMonth(previousMonth);
    comparisonEnd = endOfMonth(previousMonth);
  } else {
    comparisonEnd = addDays(normalizedStart, -1);
    comparisonStart = addDays(comparisonEnd, -(normalizedDuration - 1));
  }

  return {
    periodType: input.periodType,
    startDate: toDateString(normalizedStart),
    endDate: toDateString(normalizedEnd),
    comparisonStartDate: toDateString(comparisonStart),
    comparisonEndDate: toDateString(comparisonEnd),
    durationDays: normalizedDuration,
  };
}

function parseTransactionDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function within(date: Date, start: string, end: string): boolean {
  return date >= parseDate(start, 'period_start') && date <= parseDate(end, 'period_end');
}

function aggregateRange(rows: readonly TransactionSummaryRow[], start: string, end: string): TransactionAggregate {
  let income = 0;
  let expense = 0;
  let transactionCount = 0;
  const categories = new Map<string, number>();

  for (const row of rows) {
    const date = parseTransactionDate(row.date);
    if (!date || !within(date, start, end)) continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    transactionCount += 1;
    if (row.type === 'income') {
      income += amount;
    } else if (row.type === 'expense') {
      expense += amount;
      categories.set(row.category || 'Lainnya', (categories.get(row.category || 'Lainnya') ?? 0) + amount);
    }
  }

  const topExpenseCategories = [...categories.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: expense > 0 ? Number(((amount / expense) * 100).toFixed(1)) : 0,
    }));

  return { income, expense, transactionCount, topExpenseCategories };
}

function changePercent(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function direction(incomeChange: number | null, expenseChange: number | null): AggregatedTransactionSummary['comparison']['direction'] {
  const values = [incomeChange, expenseChange].filter((value): value is number => value !== null);
  if (values.length === 0) return 'unavailable';
  const net = values.reduce((sum, value) => sum + value, 0);
  if (Math.abs(net) < 0.05) return 'same';
  return net > 0 ? 'up' : 'down';
}

export function aggregateTransactions(
  rows: readonly TransactionSummaryRow[],
  period: ResolvedSummaryPeriod,
): AggregatedTransactionSummary {
  const current = aggregateRange(rows, period.startDate, period.endDate);
  const previous = aggregateRange(rows, period.comparisonStartDate, period.comparisonEndDate);
  const incomeChangePercent = changePercent(current.income, previous.income);
  const expenseChangePercent = changePercent(current.expense, previous.expense);

  return {
    current,
    comparisonPeriod: {
      startDate: period.comparisonStartDate,
      endDate: period.comparisonEndDate,
    },
    comparison: {
      incomeChangePercent,
      expenseChangePercent,
      direction: direction(incomeChangePercent, expenseChangePercent),
    },
  };
}

function finiteNonNegative(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${field} must be a non-negative number`);
  }
  return value;
}

export function validateSummaryOutput(value: unknown): TransactionSummaryOutput {
  if (!value || typeof value !== 'object') throw new ValidationError('AI summary must be an object');
  const output = value as Record<string, unknown>;
  if (typeof output.headline !== 'string' || !output.headline.trim() || output.headline.length > MAX_HEADLINE_LENGTH) {
    throw new ValidationError('AI summary headline is invalid');
  }
  const totals = output.totals;
  if (!totals || typeof totals !== 'object') throw new ValidationError('AI summary totals are invalid');
  const totalValues = totals as Record<string, unknown>;
  const normalizedTotals = {
    income: finiteNonNegative(totalValues.income, 'totals.income'),
    expense: finiteNonNegative(totalValues.expense, 'totals.expense'),
  };

  if (!Array.isArray(output.top_expense_categories) || output.top_expense_categories.length > 3) {
    throw new ValidationError('top_expense_categories must contain at most 3 items');
  }
  const categories = output.top_expense_categories.map((item, index) => {
    if (!item || typeof item !== 'object') throw new ValidationError(`top_expense_categories[${index}] is invalid`);
    const category = item as Record<string, unknown>;
    if (typeof category.category !== 'string' || !category.category.trim() || category.category.length > 100) {
      throw new ValidationError(`top_expense_categories[${index}].category is invalid`);
    }
    return {
      category: category.category.trim(),
      amount: finiteNonNegative(category.amount, `top_expense_categories[${index}].amount`),
      percentage: finiteNonNegative(category.percentage, `top_expense_categories[${index}].percentage`),
    };
  });

  const comparison = output.comparison;
  if (!comparison || typeof comparison !== 'object') throw new ValidationError('AI summary comparison is invalid');
  const comparisonValues = comparison as Record<string, unknown>;
  const directionValue = comparisonValues.direction;
  if (!['up', 'down', 'same', 'unavailable'].includes(String(directionValue))) {
    throw new ValidationError('AI summary comparison direction is invalid');
  }
  const normalizeChange = (value: unknown, field: string): number | null => {
    if (value === null) return null;
    return finiteNonNegative(Math.abs(Number(value)), field) * (Number(value) < 0 ? -1 : 1);
  };
  if (!Array.isArray(output.insights) || output.insights.length < 1 || output.insights.length > 2) {
    throw new ValidationError('insights must contain 1 or 2 items');
  }
  const insights = output.insights.map((item, index) => {
    if (typeof item !== 'string' || !item.trim() || item.length > MAX_INSIGHT_LENGTH) {
      throw new ValidationError(`insights[${index}] is invalid`);
    }
    return item.trim();
  });

  return {
    headline: output.headline.trim(),
    totals: normalizedTotals,
    top_expense_categories: categories,
    comparison: {
      income_change_percent: normalizeChange(comparisonValues.income_change_percent, 'comparison.income_change_percent'),
      expense_change_percent: normalizeChange(comparisonValues.expense_change_percent, 'comparison.expense_change_percent'),
      direction: directionValue as TransactionSummaryOutput['comparison']['direction'],
    },
    insights,
  };
}

export const TRANSACTION_SUMMARY_LIMITS = {
  maxCustomRangeDays: MAX_CUSTOM_RANGE_DAYS,
} as const;