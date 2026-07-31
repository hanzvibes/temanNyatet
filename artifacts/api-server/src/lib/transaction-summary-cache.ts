import { supabaseAdmin } from './supabase-admin.js';
import type {
  ResolvedSummaryPeriod,
  SummaryPeriodType,
  TransactionSummaryOutput,
} from './transaction-summary.js';

export type TransactionSummaryRecord = TransactionSummaryOutput & {
  id: string;
  period_type: SummaryPeriodType;
  period_start: string;
  period_end: string;
  comparison_start: string;
  comparison_end: string;
  created_at: string;
  updated_at: string;
};

type CacheRow = {
  id: string;
  period_type: SummaryPeriodType;
  period_start: string;
  period_end: string;
  comparison_start: string;
  comparison_end: string;
  headline: string;
  totals: TransactionSummaryOutput['totals'];
  top_expense_categories: TransactionSummaryOutput['top_expense_categories'];
  comparison: TransactionSummaryOutput['comparison'];
  insights: string[];
  created_at: string;
  updated_at: string;
};

function toRecord(row: CacheRow): TransactionSummaryRecord {
  return {
    id: row.id,
    period_type: row.period_type,
    period_start: row.period_start,
    period_end: row.period_end,
    comparison_start: row.comparison_start,
    comparison_end: row.comparison_end,
    headline: row.headline,
    totals: row.totals,
    top_expense_categories: row.top_expense_categories,
    comparison: row.comparison,
    insights: row.insights,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getCachedTransactionSummary(
  userId: string,
  period: ResolvedSummaryPeriod,
): Promise<TransactionSummaryRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('transaction_summary_cache')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', period.periodType)
    .eq('period_start', period.startDate)
    .eq('period_end', period.endDate)
    .maybeSingle();
  if (error) throw error;
  return data ? toRecord(data as CacheRow) : null;
}

export async function consumeAndCacheTransactionSummary(
  userId: string,
  requestId: string,
  period: ResolvedSummaryPeriod,
  output: TransactionSummaryOutput,
): Promise<{ balance: number; summary: TransactionSummaryRecord }> {
  const { data, error } = await supabaseAdmin.rpc('consume_and_cache_transaction_summary', {
    target_user_id: userId,
    credit_reference: requestId,
    summary_period_type: period.periodType,
    summary_period_start: period.startDate,
    summary_period_end: period.endDate,
    summary_comparison_start: period.comparisonStartDate,
    summary_comparison_end: period.comparisonEndDate,
    summary_headline: output.headline,
    summary_totals: output.totals,
    summary_top_expense_categories: output.top_expense_categories,
    summary_comparison: output.comparison,
    summary_insights: output.insights,
  });
  if (error) {
    if (error.message.includes('CREDITS_EXHAUSTED')) {
      const exhausted = new Error('CREDITS_EXHAUSTED');
      exhausted.name = 'CreditsExhaustedError';
      throw exhausted;
    }
    throw error;
  }
  const row = (Array.isArray(data) ? data[0] : data) as {
    balance?: number;
    summary?: CacheRow;
  } | null;
  if (!row?.summary) throw new Error('TRANSACTION_SUMMARY_CACHE_WRITE_FAILED');
  return {
    balance: Number(row.balance ?? 0),
    summary: toRecord(row.summary),
  };
}