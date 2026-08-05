import { format } from 'date-fns';
import * as z from 'zod';
import type { TransactionType } from '@/lib/database.types';

export const DEFAULT_INCOME_CATEGORIES = [
  'Gaji', 'Freelance', 'Bisnis', 'Investasi', 'Hadiah', 'Lainnya',
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Makanan', 'Transport', 'Belanja', 'Tagihan', 'Kesehatan',
  'Hiburan', 'Pendidikan', 'Lainnya',
] as const;

export const DEFAULT_PAYMENT_SOURCES = [
  'BCA', 'BRI', 'BNI', 'Mandiri', 'GoPay', 'OVO', 'Dana', 'QRIS',
  'Transfer', 'Debit', 'E-Wallet', 'Cash', 'Lainnya',
] as const;

/**
 * The transaction form is rendered in more than one surface (the shared
 * mobile sheet and the desktop page). Keep its validation contract here so
 * those surfaces cannot drift apart.
 */
export const transactionFormSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.string().min(1, 'Nominal harus diisi'),
  category: z.string().min(1, 'Pilih kategori'),
  source: z.string().min(1, 'Pilih sumber dana'),
  note: z.string().optional(),
  date: z.string().min(1, 'Pilih tanggal'),
});

export type TransactionFormValues = z.infer<typeof transactionFormSchema>;

export const createTransactionFormDefaults = (
  type: TransactionType = 'expense',
): TransactionFormValues => ({
  type,
  amount: '',
  category: '',
  source: 'Cash',
  note: '',
  date: format(new Date(), 'yyyy-MM-dd'),
});

export function getTransactionCategories(type: TransactionType) {
  return type === 'income'
    ? DEFAULT_INCOME_CATEGORIES
    : DEFAULT_EXPENSE_CATEGORIES;
}

/** Converts Indonesian-formatted input such as "1.250.000" into rupiah. */
export function parseTransactionAmount(value: string): number {
  return Number(value.replace(/\D/g, ''));
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatRupiahCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  }
  return formatRupiah(amount);
}