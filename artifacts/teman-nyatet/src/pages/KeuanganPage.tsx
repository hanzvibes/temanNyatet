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
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  PanelTopOpen,
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
const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

const formatRupiahCompact = (amount: number) => {
  if (Math.abs(amount) >= 1_000_000)
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(amount);
  return formatRupiah(amount);
};

const INP =
  'w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:border-finance focus:ring-2 focus:ring-finance/20 text-sm font-semibold text-foreground transition-all placeholder:text-muted-foreground/50';

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

// ─── Balance Hero ─────────────────────────────────────────────────────────────
function BalanceHero({
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
  const isPositive = net >= 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      aria-label="Ringkasan saldo bulan ini"
    >
      {/* Eyebrow */}
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 mb-3">
        {format(new Date(), 'MMMM yyyy', { locale: id })}
      </p>

      {/* Balance */}
      <motion.p
        key={balance}
        initial={{ opacity: 0.5, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-[clamp(2.4rem,9vw,3.25rem)] font-black tracking-[-0.055em] text-foreground tabular-nums leading-none"
      >
        {formatRupiah(balance)}
      </motion.p>

      {/* Net flow line */}
      <div className="mt-2 flex items-center gap-1.5">
        {isPositive ? (
          <TrendingUp size={13} strokeWidth={2.5} className="text-income shrink-0" />
        ) : (
          <TrendingDown size={13} strokeWidth={2.5} className="text-expense shrink-0" />
        )}
        <span
          className={`text-[12px] font-semibold tabular-nums ${
            isPositive ? 'text-income' : 'text-expense'
          }`}
        >
          {isPositive ? '+' : ''}
          {formatRupiahCompact(net)} bulan ini
        </span>
      </div>

      {/* Hairline rule */}
      <div className="mt-5 h-px bg-border/60" />

      {/* Income / Expense stats */}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-income/12">
            <ArrowDownLeft size={15} strokeWidth={2.5} className="text-income" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
              Pemasukan
            </p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-income">
              {formatRupiahCompact(income)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-expense/10">
            <ArrowUpRight size={15} strokeWidth={2.5} className="text-expense" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
              Pengeluaran
            </p>
            <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-expense">
              {formatRupiahCompact(expense)}
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="h-1 overflow-hidden rounded-full bg-border/60">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${incomeRatio}%` }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
            className="h-full rounded-full bg-income"
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[9px] font-semibold tracking-wide text-muted-foreground/60">
          <span>Masuk {incomeRatio}%</span>
          <span>Keluar {100 - incomeRatio}%</span>
        </div>
      </div>
    </motion.section>
  );
}

// ─── Date Label ────────────────────────────────────────────────────────────────
function getFormatDate(dateStr: string) {
  const date = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
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
      ? (window.visualViewport?.height ?? window.innerHeight)
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

  useEffect(() => {
    if (pendingCreate === 'keuangan') {
      handleOpenForm('expense');
      clearCreate();
    }
  }, [pendingCreate]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setSheetViewportHeight(window.visualViewport?.height ?? window.innerHeight);
      });
    };
    update();
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
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

  const openBottomSheet = () => {
    window.dispatchEvent(new Event('teman-nyatet:open-bottom-sheet'));
  };

  const openCreateAction = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      handleOpenForm('expense');
      return;
    }
    openBottomSheet();
  };

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-16">

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/40">
        <div className="mx-auto max-w-screen-xl px-5 py-4 sm:px-6 sm:py-5 lg:px-10 lg:py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-pill-label mb-1 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-page-title">Keuangan</h1>
            </div>
             <div className="flex items-center gap-2">
               <Button
                 type="button"
                 variant="outline"
                 size="icon"
                 className="lg:hidden border-finance/30 text-finance-text hover:bg-finance/10"
                 onClick={openBottomSheet}
                 aria-label="Buka menu tambah keuangan"
               >
                 <PanelTopOpen size={18} strokeWidth={2.3} />
               </Button>
               <SettingsSheet
                 avatarBg="bg-finance/15"
                 avatarTextColor="text-finance-text"
               />
             </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto flex min-h-0 w-full max-w-screen-xl flex-1 overflow-hidden px-5 pt-6 pb-6 sm:px-6 sm:pt-8 sm:pb-8 lg:px-10 lg:pt-10">
        <div className="grid h-full min-h-0 w-full gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.38fr)] lg:items-start">

          {/* ── Left column ── */}
          <div className="flex min-h-0 flex-col gap-8 lg:order-1">

            {/* Balance hero */}
            <BalanceHero
              balance={monthlySummary.balance}
              income={monthlySummary.income}
              expense={monthlySummary.expense}
            />

            {/* Mobile summary — compact version; the desktop version lives in the sidebar below. */}
            <section
              aria-labelledby="mobile-month-summary-title"
              className="rounded-2xl border border-border/50 bg-card px-4 py-3.5 lg:hidden"
            >
              <p
                id="mobile-month-summary-title"
                className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70"
              >
                Ringkasan {format(new Date(), 'MMMM yyyy', { locale: id })}
              </p>

              <div className="mt-2.5 grid grid-cols-3 divide-x divide-border/60">
                <div className="min-w-0 pr-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground/75">Masuk</p>
                  <p className="mt-0.5 truncate text-[13px] font-black tabular-nums text-income">
                    {formatRupiahCompact(monthlySummary.income)}
                  </p>
                </div>
                <div className="min-w-0 px-2.5">
                  <p className="text-[10px] font-semibold text-muted-foreground/75">Keluar</p>
                  <p className="mt-0.5 truncate text-[13px] font-black tabular-nums text-expense">
                    {formatRupiahCompact(monthlySummary.expense)}
                  </p>
                </div>
                <div className="min-w-0 pl-2.5 text-right">
                  <p className="text-[10px] font-semibold text-muted-foreground/75">Sisa</p>
                  <p
                    className={`mt-0.5 truncate text-[13px] font-black tabular-nums ${
                      monthlySummary.balance >= 0 ? 'text-foreground' : 'text-expense'
                    }`}
                  >
                    {formatRupiahCompact(monthlySummary.balance)}
                  </p>
                </div>
              </div>
            </section>

            {/* Search */}
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari transaksi..."
            />

            {/* Transaction list */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[1.5rem] border border-border/45 bg-card/25 px-2 pt-2 pr-1 [scrollbar-gutter:stable] pb-[calc(var(--bottom-nav-collapsed-h)+env(safe-area-inset-bottom)+1.5rem)] lg:rounded-2xl lg:px-3 lg:pt-3 lg:pb-6">
              {loading ? (
                <PageLoading accent="keuangan" label="Memuat transaksi…" />
              ) : sortedDates.length === 0 ? (
                <PageEmpty
                  accent="keuangan"
                  icon={Wallet}
                  title={search ? 'Tidak ada hasil pencarian' : 'Belum ada transaksi bulan ini'}
                  description={
                    search
                      ? 'Coba kata kunci lain atau hapus filter.'
                      : 'Catat pemasukan dan pengeluaran kamu agar keuangan tetap terpantau.'
                  }
                  cta={
                    !search ? (
                      <Button
                        onClick={openCreateAction}
                        className="bg-finance text-finance-text hover:bg-finance/90 rounded-full px-6 py-3"
                      >
                        <Plus size={16} strokeWidth={2.5} />
                        Catat Transaksi
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                  <div className="space-y-7">
                  {/* Section meta */}
                   <div className="sticky top-0 z-[1] -mx-1 flex items-center justify-between rounded-xl bg-background/90 px-2 py-2 backdrop-blur-md">
                    <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                      Riwayat Transaksi
                    </h2>
                    <span className="text-[11px] font-semibold text-muted-foreground/60 tabular-nums">
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
                        {/* Date row */}
                        <div className="mb-2.5 flex items-center justify-between px-0.5">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={11}
                              strokeWidth={2.2}
                              className="text-muted-foreground/50 shrink-0"
                            />
                            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                              {getFormatDate(dateStr)}
                            </span>
                          </div>
                          <span
                            className={`text-[11px] font-bold tabular-nums ${
                              dayNet >= 0 ? 'text-income' : 'text-expense'
                            }`}
                          >
                            {dayNet >= 0 ? '+' : ''}
                            {formatRupiahCompact(dayNet)}
                          </span>
                        </div>

                        {/* Transaction group — flat card */}
                        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card">
                          <AnimatePresence>
                            {dayTxs.map((tx, i, arr) => {
                              const Icon = CATEGORY_ICON[tx.category] ?? FALLBACK_CATEGORY_ICON;
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
                                      className="grid min-h-[4.25rem] grid-cols-[2.75rem_minmax(0,1fr)_minmax(5rem,auto)] items-center gap-x-3.5 px-4 py-3 transition-colors hover:bg-muted/20 active:bg-muted/40 select-none focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-finance"
                                    >
                                      {/* Icon */}
                                      <div
                                        className={`flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-[0.875rem] ${
                                          tx.type === 'income'
                                            ? 'bg-income/10'
                                            : 'bg-expense/8'
                                        }`}
                                      >
                                        <Icon
                                          size={18}
                                          strokeWidth={2}
                                          className={
                                            tx.type === 'income'
                                              ? 'text-income'
                                              : 'text-expense'
                                          }
                                        />
                                      </div>

                                      {/* Category + meta */}
                                      <div className="min-w-0">
                                        <p className="truncate text-[13.5px] font-semibold leading-5 text-foreground">
                                          {tx.category}
                                        </p>
                                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                          <span className="shrink-0 text-[11px] font-medium text-muted-foreground/70">
                                            {tx.source}
                                          </span>
                                          {tx.note && (
                                            <>
                                              <span className="text-muted-foreground/30 text-[10px]">·</span>
                                              <span className="min-w-0 truncate text-[11px] text-muted-foreground/55">
                                                {tx.note}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Amount */}
                                      <div className="min-w-0 shrink-0 text-right">
                                        <p
                                          className={`text-[13.5px] font-bold tabular-nums leading-5 ${
                                            tx.type === 'income'
                                              ? 'text-income'
                                              : 'text-foreground'
                                          }`}
                                        >
                                          {tx.type === 'income' ? '+' : '−'}
                                          {formatRupiahCompact(tx.amount)}
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/45">
                                          {tx.type === 'income' ? 'masuk' : 'keluar'}
                                        </p>
                                      </div>
                                    </AnimatedListItem>
                                  </SwipeableTransactionRow>

                                  {/* Inset divider */}
                                  {i < arr.length - 1 && (
                                    <div className="ml-[3.75rem] border-b border-border/40" />
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

          {/* ── Desktop sidebar ── */}
          <aside className="order-first hidden rounded-2xl border border-border/50 bg-card p-5 lg:order-2 lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
              Ringkasan bulan
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {format(new Date(), 'MMMM yyyy', { locale: id })}
            </p>

            <div className="mt-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-income/12">
                    <ArrowDownLeft size={13} strokeWidth={2.5} className="text-income" />
                  </div>
                  <span className="text-sm text-muted-foreground">Pemasukan</span>
                </div>
                <span className="text-sm font-bold text-income tabular-nums">
                  {formatRupiahCompact(monthlySummary.income)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-expense/10">
                    <ArrowUpRight size={13} strokeWidth={2.5} className="text-expense" />
                  </div>
                  <span className="text-sm text-muted-foreground">Pengeluaran</span>
                </div>
                <span className="text-sm font-bold text-expense tabular-nums">
                  {formatRupiahCompact(monthlySummary.expense)}
                </span>
              </div>

              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Sisa bulan ini</span>
                  <span
                    className={`text-sm font-extrabold tabular-nums ${
                      monthlySummary.income - monthlySummary.expense >= 0
                        ? 'text-foreground'
                        : 'text-expense'
                    }`}
                  >
                    {formatRupiahCompact(
                      monthlySummary.income - monthlySummary.expense,
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Add button */}
            <button
              onClick={() => handleOpenForm('expense')}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-finance/10 py-3 text-sm font-bold text-finance-text transition-colors hover:bg-finance/18 active:bg-finance/22 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance/40"
            >
              <Plus size={15} strokeWidth={2.5} />
              Catat Transaksi
            </button>
          </aside>
        </div>
      </div>

      {/* ── Form Sheet ── */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/35 z-50 backdrop-blur-[2px]" />
          <Drawer.Content
            style={{
              height: `${Math.min(Math.max(sheetViewportHeight * 0.92, 360), 720)}px`,
              maxHeight: 'calc(100dvh - env(safe-area-inset-top))',
            }}
            className="fixed bottom-0 left-0 right-0 z-50 flex min-h-0 flex-col overflow-hidden rounded-t-[1.75rem] border-t border-border/60 bg-card shadow-elevation-3 outline-none sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2"
          >
            {/* Drag handle */}
            <div className="mx-auto mt-3.5 mb-1 h-1 w-10 flex-shrink-0 rounded-full bg-muted-foreground/20" />

            <form
              onSubmit={form.handleSubmit(onSubmitForm)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">

                {/* ── Type Toggle ── */}
                <div className="my-5 flex rounded-[1rem] bg-muted/50 p-1">
                  {(['expense', 'income'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTxType(t);
                        form.setValue('type', t);
                        form.setValue('category', '');
                      }}
                      className={`min-h-10 flex-1 rounded-[0.75rem] py-2.5 text-sm font-bold transition-all ${
                        txType === t
                          ? 'bg-card text-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground/80'
                      }`}
                    >
                      {t === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                    </button>
                  ))}
                </div>

                {/* ── Amount ── */}
                <div className="mb-5">
                  <label className="text-pill-label mb-2.5 block">Nominal</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/40 select-none">
                      Rp
                    </span>
                    <input
                      {...form.register('amount')}
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      className="w-full min-w-0 rounded-[1.25rem] border border-border bg-background py-4 pl-12 pr-4 text-[clamp(1.75rem,8vw,2.25rem)] font-black tracking-[-0.03em] text-foreground outline-none transition-all focus:border-finance focus:ring-2 focus:ring-finance/20 sm:py-5 sm:pl-13"
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const formatted = val
                          ? new Intl.NumberFormat('id-ID').format(Number(val))
                          : '';
                        form.setValue('amount', formatted, { shouldValidate: true });
                      }}
                    />
                  </div>
                  {form.formState.errors.amount && (
                    <FormError className="mt-2 ml-1" size="xs">
                      {form.formState.errors.amount.message as string}
                    </FormError>
                  )}
                </div>

                {/* ── Date & Source ── */}
                <div className="mb-5 grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-pill-label mb-2.5 block">Tanggal</label>
                    <input
                      {...form.register('date')}
                      type="date"
                      className={`${INP} [color-scheme:light] dark:[color-scheme:dark]`}
                    />
                  </div>
                  <div>
                    <label className="text-pill-label mb-2.5 block">Sumber</label>
                    <select
                      {...form.register('source')}
                      className={`${INP} appearance-none`}
                    >
                      {DEFAULT_PAYMENT_SOURCES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ── Category Grid ── */}
                <div className="mb-5">
                  <label className="text-pill-label mb-3 block">Kategori</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(txType === 'expense'
                      ? DEFAULT_EXPENSE_CATEGORIES
                      : DEFAULT_INCOME_CATEGORIES
                    ).map((cat) => {
                      const isSelected = form.watch('category') === cat;
                      const Icon = CATEGORY_ICON[cat] ?? FALLBACK_CATEGORY_ICON;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() =>
                            form.setValue('category', cat, { shouldValidate: true })
                          }
                          className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 transition-all ${
                            isSelected
                              ? 'border-finance/60 bg-finance/8 shadow-sm'
                              : 'border-border/60 bg-card hover:bg-muted/40 hover:border-border'
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                              isSelected
                                ? txType === 'income'
                                  ? 'bg-income'
                                  : 'bg-expense'
                                : 'bg-muted/70'
                            }`}
                          >
                            <Icon
                              size={14}
                              strokeWidth={isSelected ? 2.5 : 2}
                              className={isSelected ? 'text-white' : 'text-muted-foreground'}
                            />
                          </div>
                          <span
                            className={`text-[9.5px] font-bold text-center leading-tight w-full truncate transition-colors ${
                              isSelected ? 'text-foreground' : 'text-muted-foreground'
                            }`}
                          >
                            {cat}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {form.formState.errors.category && (
                    <FormError className="mt-2.5 ml-1" size="xs">
                      {form.formState.errors.category.message as string}
                    </FormError>
                  )}
                </div>

                {/* ── Note ── */}
                <div className="mb-2">
                  <label className="text-pill-label mb-2.5 block">
                    Catatan <span className="normal-case tracking-normal font-medium opacity-60">(opsional)</span>
                  </label>
                  <input
                    {...form.register('note')}
                    type="text"
                    placeholder="Misal: Beli kopi susu…"
                    className="w-full rounded-xl border border-border bg-background py-3.5 px-4 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-finance focus:ring-2 focus:ring-finance/20"
                  />
                </div>
              </div>

              {/* ── Submit ── */}
              <div className="shrink-0 border-t border-border/50 bg-card px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3.5 sm:px-6">
                <Button
                  type="submit"
                  disabled={form.formState.isSubmitting}
                  className="min-h-[3.25rem] w-full rounded-[1rem] bg-finance py-3.5 text-[15px] font-bold text-finance-text hover:bg-finance/90 disabled:cursor-not-allowed disabled:opacity-55 transition-all"
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
