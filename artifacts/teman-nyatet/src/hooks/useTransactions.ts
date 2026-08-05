import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/apiClient';
import type { Transaction, TransactionInsert, MonthlySummary } from '@/lib/database.types';
import { toast } from 'sonner';
import { requestFreePlanLimitDialog } from '@/lib/app-events';

import { startOfMonth, endOfMonth, format } from 'date-fns';

const POLL_INTERVAL_MS = 15000;
const REFETCH_EVENT = 'teman-nyatet:refetch:transactions';

/** Safely parse a date string to a numeric timestamp; returns 0 for invalid inputs. */
function safeTime(value: string | null | undefined): number {
  if (!value) return 0;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : 0;
}

function sortTransactions(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => {
    const dateDiff = safeTime(b.date) - safeTime(a.date);
    if (dateDiff !== 0) return dateDiff;
    return safeTime(b.created_at) - safeTime(a.created_at);
  });
}

export function useTransactions(userId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const firstLoad = useRef(true);

  const fetchTransactions = useCallback(async () => {
    if (!userId) return;
    if (firstLoad.current) setLoading(true);
    try {
      const data = await apiGet<Transaction[]>('/transactions');
      setTransactions(sortTransactions(data || []));
      setError(null);
    } catch (err) {
      setError(err as Error);
      if (firstLoad.current) toast.error('Gagal mengambil transaksi');
    } finally {
      setLoading(false);
      firstLoad.current = false;
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    firstLoad.current = true;
    fetchTransactions();
    const interval = setInterval(fetchTransactions, POLL_INTERVAL_MS);
    const onExternalChange = () => fetchTransactions();
    window.addEventListener(REFETCH_EVENT, onExternalChange);
    return () => {
      clearInterval(interval);
      window.removeEventListener(REFETCH_EVENT, onExternalChange);
    };
  }, [userId, fetchTransactions]);

  const createTransaction = async (transaction: Omit<TransactionInsert, 'user_id'>) => {
    if (!userId) return;
    try {
      const data = await apiPost<Transaction>('/transactions', transaction);
      setTransactions(prev => sortTransactions([data, ...prev]));
      toast.success('Transaksi disimpan!');
      window.dispatchEvent(new CustomEvent(REFETCH_EVENT));
      return data;
    } catch (err) {
      if (err instanceof ApiError && err.code === 'FREE_PLAN_LIMIT_REACHED') {
        requestFreePlanLimitDialog({
          resource: 'transactions',
          limit: 3,
        });
      } else {
        toast.error('Gagal menyimpan transaksi');
      }
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    const prev = [...transactions];
    setTransactions(transactions.filter(t => t.id !== id));
    try {
      await apiDelete(`/transactions/${id}`);
    } catch (err) {
      setTransactions(prev);
      throw err;
    }
  };

  const monthlySummary = useMemo<MonthlySummary>(() => {
    const now = new Date();
    const start = startOfMonth(now);
    const end = endOfMonth(now);

    let income = 0;
    let expense = 0;
    let balance = 0; // Balance is all-time, not just monthly

    transactions.forEach(tx => {
      // PostgreSQL returns `amount` as a numeric string; coerce to number.
      const amount = Number(tx.amount) || 0;

      // All time balance
      if (tx.type === 'income') balance += amount;
      else if (tx.type === 'expense') balance -= amount;

      // Monthly stats
      const txDate = new Date(tx.date.slice(0, 10) + 'T12:00:00');
      if (txDate >= start && txDate <= end) {
        if (tx.type === 'income') income += amount;
        else if (tx.type === 'expense') expense += amount;
      }
    });

    return { income, expense, balance };
  }, [transactions]);

  // Chart data: Last 6 months
  const monthlyChartData = useMemo(() => {
    const months: Record<string, { income: number, expense: number, name: string }> = {};
    const now = new Date();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = format(d, 'yyyy-MM');
      months[key] = { income: 0, expense: 0, name: format(d, 'MMM') };
    }

    transactions.forEach(tx => {
      const amount = Number(tx.amount) || 0;
      const key = tx.date.slice(0, 7); // yyyy-MM
      if (months[key]) {
        if (tx.type === 'income') months[key].income += amount;
        else if (tx.type === 'expense') months[key].expense += amount;
      }
    });

    return Object.values(months);
  }, [transactions]);

  return {
    transactions,
    loading,
    error,
    createTransaction,
    deleteTransaction,
    monthlySummary,
    monthlyChartData,
    refetch: fetchTransactions
  };
}
