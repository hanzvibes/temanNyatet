import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiGet, apiPost, apiDelete } from '@/lib/apiClient';
import type { Transaction, TransactionInsert, MonthlySummary } from '@/lib/database.types';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const POLL_INTERVAL_MS = 15000;

function sortTransactions(txs: Transaction[]): Transaction[] {
  return [...txs].sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
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
    return () => clearInterval(interval);
  }, [userId, fetchTransactions]);

  const createTransaction = async (transaction: Omit<TransactionInsert, 'user_id'>) => {
    if (!userId) return;
    try {
      const data = await apiPost<Transaction>('/transactions', transaction);
      setTransactions(prev => sortTransactions([data, ...prev]));
      toast.success('Transaksi disimpan!');
      return data;
    } catch (err) {
      toast.error('Gagal menyimpan transaksi');
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    const prev = [...transactions];
    setTransactions(transactions.filter(t => t.id !== id));
    try {
      await apiDelete(`/transactions/${id}`);
      toast.success('Transaksi dihapus');
    } catch (err) {
      setTransactions(prev);
      toast.error('Gagal menghapus transaksi');
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
      // All time balance
      if (tx.type === 'income') balance += tx.amount;
      else if (tx.type === 'expense') balance -= tx.amount;

      // Monthly stats
      const txDate = new Date(tx.date);
      if (txDate >= start && txDate <= end) {
        if (tx.type === 'income') income += tx.amount;
        else if (tx.type === 'expense') expense += tx.amount;
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
      const key = tx.date.substring(0, 7); // yyyy-MM
      if (months[key]) {
        if (tx.type === 'income') months[key].income += tx.amount;
        else if (tx.type === 'expense') months[key].expense += tx.amount;
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
