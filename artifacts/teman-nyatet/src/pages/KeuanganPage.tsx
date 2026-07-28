import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SwipeableTransactionRow } from '@/components/SwipeableTransactionRow';
import SettingsSheet from '@/components/SettingsSheet';
import { useCreate } from '@/contexts/CreateContext';
import { useTransactions } from '@/hooks/useTransactions';
import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Activity,
  Plus,
  Wallet,
} from 'lucide-react';
import { CATEGORY_ICON, FALLBACK_CATEGORY_ICON } from '@/lib/categoryIcons';
import { FormError, PageEmpty, PageLoading } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
import { Drawer } from 'vaul';
import {
  TransactionType,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PAYMENT_SOURCES,
} from '@/lib/database.types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import SearchBar from '@/components/SearchBar';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getCategoryColor = (type: TransactionType) =>
  type === 'income' ? 'bg-income' : 'bg-expense';

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

const INP =
  'w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:border-finance focus:ring-2 focus:ring-finance/20 text-sm font-bold text-foreground transition-all';

// ─── Schema ───────────────────────────────────────────────────────────────────
const txSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.string().min(1, 'Nominal harus diisi'),
  category: z.string().min(1, 'Pilih kategori'),
  source: z.string().min(1, 'Pilih sumber dana'),
  note: z.string().optional(),
  date: z.string().min(1, 'Pilih tanggal'),
});

type TxFormValues = z.infer<typeof txSchema>;

// ─── Balance Card ─────────────────────────────────────────────────────────────
function BalanceCard({
  balance,
  income,
  expense,
}: {
  balance: number;
  income: number;
  expense: number;
}) {
  const net = income - expense;
  const totalActivity = income + expense;
  const incomeRatio = totalActivity > 0 ? Math.round((income / totalActivity) * 100) : 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="relative overflow-hidden rounded-[2rem] border border-card-border bg-card p-6 shadow-elevation-2"
    >
      {/* Theme-aware ambient accents */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-finance/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-10 bottom-2 h-40 w-40 rounded-full bg-income/10 blur-3xl"
      />

      <div className="relative">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Total Saldo
          </p>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-finance/15 text-finance-text">
            <Wallet size={15} strokeWidth={2.2} />
          </div>
        </div>

        {/* Balance number */}
        <motion.h2
          key={balance}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-3 truncate text-[clamp(2.1rem,7vw,2.75rem)] font-black tracking-[-0.055em] text-foreground tabular-nums"
        >
          {formatRupiah(balance)}
        </motion.h2>

        {/* Net flow chip */}
        <div className="mt-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tabular-nums ${
              net >= 0
                ? 'bg-income/20 text-income'
                : 'bg-expense/20 text-expense'
            }`}
          >
            <Activity size={9} strokeWidth={2.5} />
            {net >= 0 ? '+' : ''}
            {formatRupiah(net)} bulan ini
          </span>
        </div>

        {/* Income / Expense panels */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-surface px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Pemasukan
            </p>
            <p className="mt-1.5 truncate text-sm font-bold tabular-nums text-income">
              {formatRupiah(income)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface px-4 py-3">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              Pengeluaran
            </p>
            <p className="mt-1.5 truncate text-sm font-bold tabular-nums text-expense">
              {formatRupiah(expense)}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${incomeRatio}%` }}
              transition={{ duration: 0.65, delay: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full rounded-full bg-income"
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[9px] font-semibold text-muted-foreground">
            <span>Masuk {incomeRatio}%</span>
            <span>Keluar {100 - incomeRatio}%</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Date Label ────────────────────────────────────────────────────────────────
function getFormatDate(dateStr: string) {
  const date = new Date(
    dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr,
  );
  if (isToday(date)) return 'Hari Ini';
  if (isYesterday(date)) return 'Kemarin';
  return format(date, 'd MMMM yyyy', { locale: id });
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function KeuanganPage() {
  const { user } = useAuthContext();
  const { transactions, loading, monthlySummary, createTransaction, deleteTransaction } =
    useTransactions(user?.id);
  const { pendingCreate, clearCreate } = useCreate();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [txType, setTxType] = useState<TransactionType>('expense');
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sheetViewportHeight, setSheetViewportHeight] = useState(() =>
    typeof window !== 'undefined'
      ? window.visualViewport?.height ?? window.innerHeight
      : 800,
  );

  const form = useForm<TxFormValues>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      type: 'expense',
      amount: '',
      category: '',
      source: 'Cash',
      note: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  // Open new transaction form when triggered from DraggableSheet
  useEffect(() => {
    if (pendingCreate === 'keuangan') {
      handleOpenForm('expense');
      clearCreate();
    }
  }, [pendingCreate]);

  // Use the visual viewport so the transaction sheet moves above the
  // on-screen keyboard in mobile browsers and installed PWAs.
  useEffect(() => {
    let frame = 0;
    const updateViewportHeight = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setSheetViewportHeight(window.visualViewport?.height ?? window.innerHeight);
      });
    };

    updateViewportHeight();
    window.visualViewport?.addEventListener('resize', updateViewportHeight);
    window.addEventListener('resize', updateViewportHeight);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener('resize', updateViewportHeight);
      window.removeEventListener('resize', updateViewportHeight);
    };
  }, []);

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((tx) => {
        if (!search) return true;
        const l = search.toLowerCase();
        return (
          tx.category.toLowerCase().includes(l) ||
          (tx.note && tx.note.toLowerCase().includes(l))
        );
      }),
    [search, transactions],
  );

  const handleOpenForm = (type: TransactionType = 'expense') => {
    setTxType(type);
    form.reset({
      type,
      amount: '',
      category: '',
      source: 'Cash',
      note: '',
      date: format(new Date(), 'yyyy-MM-dd'),
    });
    setIsFormOpen(true);
  };

  const onSubmitForm = async (data: TxFormValues) => {
    const amountNum = Number(data.amount.replace(/\D/g, ''));
    if (!amountNum || amountNum <= 0) {
      form.setError('amount', { message: 'Nominal harus lebih dari 0' });
      return;
    }
    try {
      await createTransaction({
        type: data.type as TransactionType,
        amount: amountNum,
        category: data.category,
        source: data.source,
        note: data.note || null,
        date: data.date,
      });
      setIsFormOpen(false);
    } catch {
      // handled in hook
    }
  };

  const { groupedTx, sortedDates } = useMemo(() => {
    const grouped = filteredTransactions.reduce(
      (acc, tx) => {
        const d = tx.date;
        if (!acc[d]) acc[d] = [];
        acc[d].push(tx);
        return acc;
      },
      {} as Record<string, typeof transactions>,
    );

    return {
      groupedTx: grouped,
      sortedDates: Object.keys(grouped).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime(),
      ),
    };
  }, [filteredTransactions, transactions]);

  const handleSwipeDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-dvh h-full flex-col bg-background pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="mx-auto max-w-screen-xl space-y-3 px-4 py-4 pb-3 sm:px-6 sm:py-5 sm:pb-4 lg:px-10 lg:py-7 lg:pb-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-pill-label mb-1 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-page-title">Keuangan</h1>
            </div>
            <SettingsSheet
              avatarBg="bg-finance/15"
              avatarTextColor="text-finance-text"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-screen-xl space-y-6 px-4 pb-6 pt-4 sm:space-y-7 sm:px-6 sm:pb-8 sm:pt-5 lg:px-10 lg:pt-7">
        {/* ── Dashboard summary ── */}
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.55fr)]">
          <BalanceCard
            balance={monthlySummary.balance}
            income={monthlySummary.income}
            expense={monthlySummary.expense}
          />
        </div>

        {/* ── Transactions ── */}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.34fr)] lg:items-start">
          <div className="order-2 space-y-5 lg:order-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari transaksi..."
            />

            <div>
              {loading ? (
                <PageLoading accent="keuangan" label="Memuat transaksi…" />
              ) : sortedDates.length === 0 ? (
                <PageEmpty
                  accent="keuangan"
                  icon={Wallet}
                  title={
                    search
                      ? 'Tidak ada hasil pencarian'
                      : 'Belum ada transaksi bulan ini'
                  }
                  description={
                    search
                      ? 'Coba kata kunci lain atau hapus filter.'
                      : 'Catat pemasukan dan pengeluaran kamu agar keuangan tetap terpantau.'
                  }
                  cta={
                    !search ? (
                      <Button
                        onClick={() => handleOpenForm('expense')}
                        className="bg-finance text-finance-text hover:bg-finance/90 rounded-full px-6 py-3.5"
                      >
                        <Plus size={18} strokeWidth={2.5} />
                        Catat Transaksi
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-6">
                  {/* ── Section header ── */}
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-foreground/60">
                      Riwayat Transaksi
                    </h2>
                    <span className="text-xs font-semibold text-muted-foreground">
                      {filteredTransactions.length} transaksi
                    </span>
                  </div>

                  {sortedDates.map((dateStr) => {
                    const dayTxs = groupedTx[dateStr];
                    const dayNet = dayTxs.reduce(
                      (acc, tx) =>
                        tx.type === 'income' ? acc + tx.amount : acc - tx.amount,
                      0,
                    );

                    return (
                      <div key={dateStr}>
                        {/* ── Date header — centered with flanking rules ── */}
                        <div className="mb-3 flex items-center gap-2 px-1 max-[379px]:justify-between">
                          <div className="h-px min-w-4 flex-1 bg-border/50 max-[379px]:hidden" />
                          <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/70">
                            {getFormatDate(dateStr)}
                          </span>
                          <div className="h-px min-w-4 flex-1 bg-border/50 max-[379px]:hidden" />
                          {/* Daily net chip */}
                          <span
                            className={`inline-flex max-w-[48%] shrink-0 items-center truncate rounded-full px-2 py-1 text-[11px] font-bold tabular-nums ${
                              dayNet >= 0
                                ? 'bg-income/15 text-income'
                                : 'bg-expense/12 text-expense'
                            }`}
                          >
                            {dayNet >= 0 ? '+' : ''}
                            {formatRupiah(dayNet)}
                          </span>
                        </div>

                        {/* ── Grouped transaction card ── */}
                        <div className="overflow-hidden rounded-2xl border border-card-border bg-card shadow-elevation-1">
                          <AnimatePresence>
                            {dayTxs.map((tx, i, arr) => {
                              const Icon =
                                CATEGORY_ICON[tx.category] ??
                                FALLBACK_CATEGORY_ICON;
                              return (
                                <div key={tx.id}>
                                  <SwipeableTransactionRow
                                    transactionId={tx.id}
                                    isDeleting={deletingId === tx.id}
                                    onDelete={handleSwipeDelete}
                                    className="relative overflow-hidden"
                                  >
                                    <AnimatedListItem
                                      tabIndex={0}
                                      role="group"
                                      aria-label={`Transaksi ${tx.category} ${formatRupiah(tx.amount)}`}
                                      className="grid min-h-[4.5rem] grid-cols-[3rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-muted/25 active:bg-muted/45 select-none focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-finance max-[379px]:grid-cols-[3rem_minmax(0,1fr)]"
                                    >
                                      {/* Category icon — rounded-square premium */}
                                      <div
                                        className={`row-span-2 flex h-12 w-12 shrink-0 items-center justify-center self-center rounded-2xl max-[379px]:self-start ${
                                          tx.type === 'income'
                                            ? 'bg-income/12'
                                            : 'bg-expense/10'
                                        }`}
                                      >
                                        <Icon
                                          size={20}
                                          className={
                                            tx.type === 'income'
                                              ? 'text-income'
                                              : 'text-expense'
                                          }
                                          strokeWidth={2.1}
                                        />
                                      </div>

                                      {/* Category + source/note */}
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold leading-5 text-foreground">
                                          {tx.category}
                                        </p>
                                        <div className="mt-1 flex min-w-0 items-center gap-2">
                                          {/* Source badge */}
                                          <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-[11px] font-bold uppercase leading-none tracking-wide text-muted-foreground">
                                            {tx.source}
                                          </span>
                                          {tx.note && (
                                            <span className="min-w-0 truncate text-[11px] leading-4 text-muted-foreground/60">
                                              {tx.note}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Amount — right-aligned */}
                                      <div className="max-w-[48%] min-w-0 shrink-0 text-right max-[379px]:col-start-2 max-[379px]:row-start-2 max-[379px]:mt-1 max-[379px]:max-w-full max-[379px]:justify-self-start max-[379px]:text-left">
                                        <p
                                          className={`break-words text-sm font-bold tabular-nums leading-5 ${
                                            tx.type === 'income'
                                              ? 'text-income'
                                              : 'text-foreground'
                                          }`}
                                        >
                                          {tx.type === 'income' ? '+' : '−'}
                                          {formatRupiah(tx.amount)}
                                        </p>
                                        <p className="mt-1 text-[11px] font-semibold uppercase leading-4 tracking-wide text-muted-foreground/50">
                                          {tx.type === 'income' ? 'masuk' : 'keluar'}
                                        </p>
                                      </div>
                                    </AnimatedListItem>
                                  </SwipeableTransactionRow>

                                  {/* Inset divider — aligns to text, not full-bleed */}
                                  {i < arr.length - 1 && (
                                    <div className="ml-16 border-b border-border/40" />
                                  )}
                                </div>
                              );
                            })}
                          </AnimatePresence>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Desktop sidebar summary */}
          <aside className="order-1 hidden rounded-[1.25rem] border border-card-border bg-card p-5 shadow-elevation-1 lg:order-2 lg:block">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Ringkasan bulan
                </p>
                <p className="mt-1 text-sm font-bold text-foreground">
                  {format(new Date(), 'MMMM yyyy', { locale: id })}
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-finance/15 text-finance-text">
                <Activity size={17} />
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pemasukan</span>
                <span className="font-bold text-income tabular-nums">
                  {formatRupiah(monthlySummary.income)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pengeluaran</span>
                <span className="font-bold text-expense tabular-nums">
                  {formatRupiah(monthlySummary.expense)}
                </span>
              </div>
              <div className="border-t border-border/70 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-foreground">Sisa bulan ini</span>
                  <span
                    className={`font-extrabold tabular-nums ${
                      monthlySummary.income - monthlySummary.expense >= 0
                        ? 'text-foreground'
                        : 'text-expense'
                    }`}
                  >
                    {formatRupiah(monthlySummary.income - monthlySummary.expense)}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Form Sheet ── */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content
            style={{
              height: `${Math.min(Math.max(sheetViewportHeight * 0.92, 360), 720)}px`,
              maxHeight: 'calc(100dvh - env(safe-area-inset-top))',
            }}
            className="fixed bottom-0 left-0 right-0 z-50 flex min-h-0 flex-col overflow-hidden rounded-t-[2rem] border-t border-border/70 bg-card shadow-elevated outline-none sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2"
          >
            <div className="mx-auto mt-3 mb-3 h-1.5 w-12 flex-shrink-0 rounded-full bg-muted-foreground/20 sm:mb-5 sm:mt-4" />

            <form
              onSubmit={form.handleSubmit(onSubmitForm)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">
                {/* Type Toggle */}
                <div className="mb-5 flex min-h-12 rounded-[1.25rem] bg-muted/60 p-1 sm:mb-6">
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('expense');
                      form.setValue('type', 'expense');
                      form.setValue('category', '');
                    }}
                    className={`min-h-10 flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                      txType === 'expense'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTxType('income');
                      form.setValue('type', 'income');
                      form.setValue('category', '');
                    }}
                    className={`min-h-10 flex-1 rounded-xl py-2.5 text-sm font-bold transition-all ${
                      txType === 'income'
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Pemasukan
                  </button>
                </div>

                {/* Amount */}
                <div className="mb-5 sm:mb-6">
                  <label className="text-pill-label mb-2 block">Nominal</label>
                  <div className="relative">
                    <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-bold text-muted-foreground/50 pointer-events-none select-none">
                      Rp
                    </span>
                    <input
                      {...form.register('amount')}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="w-full min-w-0 rounded-[1.5rem] border border-border bg-card py-4 pl-14 pr-4 text-[clamp(1.75rem,8vw,2.25rem)] font-bold text-foreground shadow-sm outline-none transition-all focus:border-finance focus:ring-2 focus:ring-finance/20 sm:py-5 sm:pl-16 sm:pr-5"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const formatted = val
                          ? new Intl.NumberFormat('id-ID').format(Number(val))
                          : '';
                        form.setValue('amount', formatted, {
                          shouldValidate: true,
                        });
                      }}
                    />
                  </div>
                  {form.formState.errors.amount && (
                    <FormError className="mt-2 ml-2">
                      {form.formState.errors.amount.message as string}
                    </FormError>
                  )}
                </div>

                {/* Date & Source */}
                <div className="mb-5 grid grid-cols-1 gap-4 min-[380px]:grid-cols-2 sm:mb-6">
                  <div className="flex-1">
                    <label className="text-pill-label mb-2 block">Tanggal</label>
                    <input
                      {...form.register('date')}
                      type="date"
                      className={`${INP} shadow-sm [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-pill-label mb-2 block">Sumber</label>
                    <select
                      {...form.register('source')}
                      className={`${INP} appearance-none shadow-sm`}
                    >
                      {DEFAULT_PAYMENT_SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Category Grid */}
                <div className="mb-5 sm:mb-6">
                  <label className="text-pill-label mb-3 block">Kategori</label>
                  <div className="grid grid-cols-2 gap-2 min-[380px]:grid-cols-4 sm:gap-3">
                    {(txType === 'expense'
                      ? DEFAULT_EXPENSE_CATEGORIES
                      : DEFAULT_INCOME_CATEGORIES
                    ).map((cat) => {
                      const isSelected = form.watch('category') === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            form.setValue('category', cat, {
                              shouldValidate: true,
                            })
                          }
                          className={`min-h-12 flex flex-col items-center justify-center gap-1.5 p-2 sm:p-3 rounded-2xl transition-all border ${
                            isSelected
                              ? 'bg-finance/10 border-finance shadow-sm'
                              : 'bg-card border-border hover:bg-secondary hover:border-muted-foreground/30'
                          }`}
                        >
                          {(() => {
                            const Icon =
                              CATEGORY_ICON[cat] ?? FALLBACK_CATEGORY_ICON;
                            return (
                              <div
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? getCategoryColor(txType)
                                    : 'bg-muted-foreground/12'
                                }`}
                              >
                                <Icon
                                  size={16}
                                  className={
                                    isSelected
                                      ? 'text-white'
                                      : 'text-muted-foreground'
                                  }
                                  strokeWidth={isSelected ? 2.8 : 2.2}
                                />
                              </div>
                            );
                          })()}
                          <span
                            className={`text-[10px] sm:text-[11px] font-bold text-center leading-tight truncate w-full transition-colors ${
                              isSelected
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {cat}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {form.formState.errors.category && (
                    <FormError className="mt-3 ml-2">
                      {form.formState.errors.category.message as string}
                    </FormError>
                  )}
                </div>

                {/* Note */}
                <div className="mb-2">
                  <label className="text-pill-label mb-2 block">
                    Catatan Tambahan
                  </label>
                  <input
                    {...form.register('note')}
                    type="text"
                    placeholder="Misal: Beli kopi susu..."
                    className="w-full bg-card border border-border rounded-xl py-4 px-5 outline-none focus:border-finance focus:ring-2 focus:ring-finance/20 text-sm font-medium text-foreground transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="flex-shrink-0 border-t border-border/70 bg-card px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-5">
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="min-h-12 w-full rounded-[1.25rem] bg-finance py-3.5 text-base font-bold text-finance-text hover:bg-finance/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {form.formState.isSubmitting ? 'Menyimpan…' : 'Simpan Transaksi'}
                </Button>
              </div>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
