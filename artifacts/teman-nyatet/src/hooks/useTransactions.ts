import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Transaction, TransactionInsert, MonthlySummary } from '@/lib/database.types';
import { toast } from 'sonner';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export function useTransactions(userId?: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      setError(err as Error);
      toast.error('Gagal mengambil transaksi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [userId]);

  const createTransaction = async (transaction: Omit<TransactionInsert, 'user_id'>) => {
    if (!userId) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({ ...transaction, user_id: userId })
        .select()
        .single();
        
      if (error) throw error;
      
      // Update local state and sort
      const newTx = [data, ...transactions];
      newTx.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(newTx);
      
      toast.success('Transaksi disimpan!');
      return data;
    } catch (err) {
      toast.error('Gagal menyimpan transaksi');
      throw err;
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      // Optimistic
      const prev = [...transactions];
      setTransactions(transactions.filter(t => t.id !== id));
      
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
        
      if (error) {
        setTransactions(prev);
        throw error;
      }
      toast.success('Transaksi dihapus');
    } catch (err) {
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
