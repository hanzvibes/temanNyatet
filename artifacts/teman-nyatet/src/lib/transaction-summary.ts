import { apiGet, apiPost } from '@/lib/apiClient';

export type TransactionSummaryPeriodType = 'week' | 'month' | 'custom';

export type TransactionSummaryPeriod = {
  periodType: TransactionSummaryPeriodType;
  startDate: string;
  endDate: string;
};

export type TransactionSummary = {
  id: string;
  period_type: TransactionSummaryPeriodType;
  period_start: string;
  period_end: string;
  comparison_start: string;
  comparison_end: string;
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
  created_at: string;
  updated_at: string;
};

export type CachedTransactionSummaryResponse = {
  cached: boolean;
  summary: TransactionSummary | null;
};

export type GeneratedTransactionSummaryResponse = {
  summary: TransactionSummary | null;
  balance: number;
  empty?: boolean;
};

const memoryCache = new Map<string, TransactionSummary | null>();

export function transactionSummaryCacheKey(
  period: TransactionSummaryPeriod,
  userId?: string,
): string {
  return `${userId ?? 'anonymous'}:${period.periodType}:${period.startDate}:${period.endDate}`;
}

function queryFor(period: TransactionSummaryPeriod): string {
  const params = new URLSearchParams({
    period_type: period.periodType,
    start_date: period.startDate,
    end_date: period.endDate,
  });
  return `/transactions/summary?${params.toString()}`;
}

export async function getCachedTransactionSummary(
  period: TransactionSummaryPeriod,
  userId?: string,
): Promise<CachedTransactionSummaryResponse> {
  const key = transactionSummaryCacheKey(period, userId);
  if (memoryCache.has(key)) {
    return { cached: true, summary: memoryCache.get(key) ?? null };
  }
  const response = await apiGet<CachedTransactionSummaryResponse>(queryFor(period));
  if (response.summary) memoryCache.set(key, response.summary);
  return response;
}

export async function generateTransactionSummary(
  period: TransactionSummaryPeriod,
  requestId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  userId?: string,
): Promise<GeneratedTransactionSummaryResponse> {
  const response = await apiPost<GeneratedTransactionSummaryResponse>(
    '/transactions/summary/generate',
    {
      period_type: period.periodType,
      start_date: period.startDate,
      end_date: period.endDate,
      request_id: requestId,
    },
    { 'Idempotency-Key': requestId },
  );
  const key = transactionSummaryCacheKey(period, userId);
  if (response.summary) memoryCache.set(key, response.summary);
  return response;
}

export function clearTransactionSummaryMemoryCache(): void {
  memoryCache.clear();
}