import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SwipeableTransactionRow } from '@/components/SwipeableTransactionRow';
import SettingsSheet from '@/components/SettingsSheet';
import { useCreate } from '@/contexts/CreateContext';
import { useTransactions } from '@/hooks/useTransactions';
import {
  endOfMonth,
  endOfWeek,
  endOfDay,
  format,
  isToday,
  isWithinInterval,
  isYesterday,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  CalendarDays,
  Plus,
} from 'lucide-react';
import { CATEGORY_ICON, FALLBACK_CATEGORY_ICON } from '@/lib/categoryIcons';
import { FormError, PageEmpty, PageLoading } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
import { Drawer } from 'vaul';
import type { TransactionType } from '@/lib/database.types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import SearchBar from '@/components/SearchBar';
import VoiceRecordButton from '@/components/VoiceRecordButton';
import TransactionSummaryCard from '@/components/TransactionSummaryCard';
import {
  generateTransactionSummary,
  getCachedTransactionSummary,
  type TransactionSummary,
  type TransactionSummaryPeriod,
} from '@/lib/transaction-summary';
import { transactionDateValue } from '@/lib/transaction-date';
import {
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PAYMENT_SOURCES,
  formatRupiah,
  formatRupiahCompact,
  parseTransactionAmount,
  transactionFormSchema,
  createTransactionFormDefaults,
  type TransactionFormValues,
} from '@/lib/transactions';
import { requestBottomSheet, requestSettingsTopUp } from '@/lib/app-events';

const INP =
  'w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:border-finance focus:ring-2 focus:ring-finance/20 text-sm font-semibold text-foreground transition-all placeholder:text-muted-foreground/50';

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

// ─── Balance Hero ─────────────────────────────────────────────────────────────
function BalanceHero({
  balance,
  income,
  expense,
  aiSummary,
}: {
  balance: number;
  income: number;
  expense: number;
  aiSummary?: React.ReactNode;
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
      className="relative overflow-hidden rounded-[1.75rem] border border-finance/25 bg-card p-5 shadow-elevation-1 sm:p-6"
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-finance/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/75">
              Saldo bulan ini
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {format(new Date(), 'MMMM yyyy', { locale: id })}
            </p>
          </div>
          <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-bold ${
            isPositive ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense'
          }`}>
            {isPositive ? <TrendingUp size={13} strokeWidth={2.5} /> : <TrendingDown size={13} strokeWidth={2.5} />}
            <span>Arus bersih</span>
          </div>
        </div>

        <motion.p
          key={balance}
          initial={{ opacity: 0.5, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-5 max-w-full break-words text-[clamp(2.15rem,10vw,3.5rem)] font-black leading-[1] tracking-[-0.06em] text-foreground tabular-nums"
        >
          {formatRupiah(balance)}
        </motion.p>
        <p className={`mt-2 flex items-center gap-1.5 text-xs font-bold tabular-nums ${
          isPositive ? 'text-income' : 'text-expense'
        }`}>
          {isPositive ? '+' : ''}{formatRupiahCompact(net)} dari aktivitas bulan ini
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl bg-income/[0.07] px-3.5 py-3">
            <div className="flex items-center gap-2 text-income">
              <ArrowDownLeft size={15} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-[0.13em]">Pemasukan</span>
            </div>
            <p className="mt-2 truncate text-sm font-black tabular-nums text-foreground">
              {formatRupiahCompact(income)}
            </p>
          </div>
          <div className="rounded-2xl bg-expense/[0.07] px-3.5 py-3">
            <div className="flex items-center gap-2 text-expense">
              <ArrowUpRight size={15} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-[0.13em]">Pengeluaran</span>
            </div>
            <p className="mt-2 truncate text-sm font-black tabular-nums text-foreground">
              {formatRupiahCompact(expense)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
            <span>Komposisi arus kas</span>
            <span className="tabular-nums">{incomeRatio}% masuk</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-expense/15">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${incomeRatio}%` }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full rounded-full bg-income"
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-muted-foreground/65">
            <span>Pemasukan</span>
            <span>{100 - incomeRatio}% pengeluaran</span>
          </div>
        </div>

        {aiSummary}
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
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [customStartDate, setCustomStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [customDraftStartDate, setCustomDraftStartDate] = useState(() => format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customDraftEndDate, setCustomDraftEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryGenerating, setSummaryGenerating] = useState(false);
  const [summaryLoadError, setSummaryLoadError] = useState<string | null>(null);
  const [summaryGenerateError, setSummaryGenerateError] = useState<string | null>(null);
  const [summaryEmpty, setSummaryEmpty] = useState(false);
  const [summaryBalance, setSummaryBalance] = useState<number | null>(null);
  const summaryRequestId = useRef<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sheetViewportHeight, setSheetViewportHeight] = useState(() =>
    typeof window !== 'undefined'
      ? (window.visualViewport?.height ?? window.innerHeight)
      : 800,
  );

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: createTransactionFormDefaults(),
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

  const periodRange = useMemo(() => {
    const now = new Date();
    if (periodFilter === 'all') return null;
    if (periodFilter === 'today') return { start: startOfDay(now), end: endOfDay(now) };
    if (periodFilter === 'week') {
      return {
        start: startOfWeek(now, { weekStartsOn: 1 }),
        end: endOfWeek(now, { weekStartsOn: 1 }),
      };
    }
    if (periodFilter === 'custom') {
      return {
        start: new Date(`${customStartDate}T12:00:00`),
        end: new Date(`${customEndDate}T12:00:00`),
      };
    }
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }, [customEndDate, customStartDate, periodFilter]);

  const summaryPeriod = useMemo<TransactionSummaryPeriod | null>(() => {
    if (!periodRange || periodFilter === 'today') return null;
    if (periodFilter === 'week') {
      return {
        periodType: 'week',
        startDate: format(periodRange.start, 'yyyy-MM-dd'),
        endDate: format(periodRange.end, 'yyyy-MM-dd'),
      };
    }
    if (periodFilter === 'month') {
      return {
        periodType: 'month',
        startDate: format(periodRange.start, 'yyyy-MM-dd'),
        endDate: format(periodRange.end, 'yyyy-MM-dd'),
      };
    }
    return {
      periodType: 'custom',
      startDate: format(periodRange.start, 'yyyy-MM-dd'),
      endDate: format(periodRange.end, 'yyyy-MM-dd'),
    };
  }, [periodFilter, periodRange]);

  const loadSummary = async () => {
    if (!summaryPeriod) return;
    setSummaryLoading(true);
    setSummaryLoadError(null);
    setSummaryEmpty(false);
    try {
      const response = await getCachedTransactionSummary(summaryPeriod, user?.id);
      setSummary(response.summary);
      setSummaryEmpty(false);
    } catch (err) {
      setSummary(null);
      setSummaryLoadError(err instanceof Error ? err.message : 'Gagal memuat ringkasan AI');
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (!summaryPeriod) {
      setSummary(null);
      setSummaryLoading(false);
      setSummaryLoadError(null);
      setSummaryGenerateError(null);
      setSummaryEmpty(false);
      return () => {
        cancelled = true;
      };
    }
    setSummaryLoading(true);
    setSummaryLoadError(null);
    setSummaryGenerateError(null);
    setSummaryEmpty(false);
    getCachedTransactionSummary(summaryPeriod, user?.id)
      .then((response) => {
        if (cancelled) return;
        setSummary(response.summary);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSummary(null);
        setSummaryLoadError(err instanceof Error ? err.message : 'Gagal memuat ringkasan AI');
      })
      .finally(() => {
        if (!cancelled) setSummaryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [summaryPeriod]);

  useEffect(() => {
    summaryRequestId.current = null;
  }, [summaryPeriod]);

  const handleGenerateSummary = async () => {
    if (!summaryPeriod) return;
    setSummaryGenerating(true);
    setSummaryGenerateError(null);
    setSummaryEmpty(false);
    try {
      const requestId = summaryRequestId.current ?? (
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`
      );
      summaryRequestId.current = requestId;
      const response = await generateTransactionSummary(summaryPeriod, requestId, user?.id);
      setSummary(response.summary);
      setSummaryBalance(response.balance);
      setSummaryEmpty(Boolean(response.empty));
      summaryRequestId.current = null;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gagal membuat ringkasan AI';
      setSummaryGenerateError(message);
      if (message === 'CREDITS_EXHAUSTED') {
        requestSettingsTopUp();
      }
    } finally {
      setSummaryGenerating(false);
    }
  };

  const applyCustomRange = () => {
    if (!customDraftStartDate || !customDraftEndDate || customDraftEndDate < customDraftStartDate) {
      setSummaryLoadError('Tanggal akhir harus sama atau setelah tanggal mulai');
      return;
    }
    setCustomStartDate(customDraftStartDate);
    setCustomEndDate(customDraftEndDate);
    setSummaryLoadError(null);
    setPeriodFilter('custom');
  };

  const periodTransactions = useMemo(
    () =>
      periodRange
        ? transactions.filter((tx) => {
            const txDate = transactionDateValue(tx.date);
            return isWithinInterval(txDate, periodRange);
          })
        : transactions,
    [periodRange, transactions],
  );

  const filteredTransactions = useMemo(
    () =>
      periodTransactions.filter((tx) => {
        if (!search) return true;
        const l = search.toLowerCase();
        return (
          tx.category.toLowerCase().includes(l) ||
          (tx.note && tx.note.toLowerCase().includes(l)) ||
          tx.source.toLowerCase().includes(l)
        );
      }),
    [periodTransactions, search],
  );

  const handleOpenForm = (type: TransactionType = 'expense') => {
    requestBottomSheet({ transactionType: type });
  };

  const onSubmitForm = async (data: TransactionFormValues) => {
    const amountNum = parseTransactionAmount(data.amount);
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

  const handleVoiceTranscript = (text: string) => {
    const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 1024;

    if (isFormOpen || isDesktop) {
      const current = form.getValues('note')?.trim() ?? '';
      form.setValue('note', current ? `${current}\n${text}` : text, {
        shouldValidate: true,
        shouldDirty: true,
      });
      if (!isFormOpen) setIsFormOpen(true);
      return;
    }

    // The mobile transaction form lives inside BottomSheetNav. Let it open
    // itself and apply the transcript once its form has mounted.
    requestBottomSheet({
      transactionType: 'expense',
      voiceTranscript: text,
    });
  };

  const { groupedTx, sortedDates } = useMemo(() => {
    const grouped = filteredTransactions.reduce(
      (acc, tx) => {
        // Normalize to YYYY-MM-DD so PostgreSQL ISO timestamps and
        // Google Sheets date-only strings both group by the same key.
        const d = tx.date.slice(0, 10);
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
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-background">

      {/* ── Header ── */}
      <div className="sticky top-0 z-20 border-b border-border/45 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-3.5 sm:px-6 sm:py-4 lg:px-8 lg:py-5">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">TemanNyatet</p>
              <h1 className="mt-1 text-[clamp(1.25rem,4vw,1.6rem)] font-black tracking-[-0.04em] text-foreground">
                Keuangan
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => handleOpenForm('expense')}
                className="min-h-10 gap-1.5 rounded-xl bg-finance px-3.5 font-bold text-finance-text shadow-sm transition-transform hover:bg-finance/90 active:scale-[0.98] sm:px-4"
                aria-label="Tambah transaksi"
              >
                <Plus size={16} strokeWidth={2.7} />
                <span className="hidden min-[380px]:inline">Tambah</span>
              </Button>
              <SettingsSheet
                avatarBg="bg-finance/15"
                avatarTextColor="text-finance-text"
                viewport="mobile"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 overflow-hidden px-4 pt-4 pb-6 sm:px-6 sm:pt-5 sm:pb-8 lg:px-8 lg:pt-6">
        <div className="flex h-full min-h-0 w-full justify-center">

          {/* ── Left column ── */}
          <div className="flex min-h-0 w-full max-w-2xl flex-col gap-4">

            {/* Balance hero */}
            <BalanceHero
              balance={monthlySummary.balance}
              income={monthlySummary.income}
              expense={monthlySummary.expense}
              aiSummary={
                summaryPeriod ? (
                  <TransactionSummaryCard
                    variant="hero"
                    period={summaryPeriod}
                    summary={summary}
                    loading={summaryLoading}
                    generating={summaryGenerating}
                    loadError={summaryLoadError}
                    generateError={summaryGenerateError}
                    empty={summaryEmpty}
                    balance={summaryBalance}
                    onGenerate={handleGenerateSummary}
                    onRetryLoad={loadSummary}
                    onOpenTopUp={requestSettingsTopUp}
                  />
                ) : (
                  <div className="mt-6 flex items-start gap-3 rounded-[1.35rem] border border-primary/15 bg-primary/[0.05] px-4 py-3.5 text-xs font-semibold leading-relaxed text-muted-foreground">
                    <span className="mt-0.5 shrink-0 text-primary">✦</span>
                    <span>Ringkasan AI tersedia untuk Minggu Ini, Bulan Ini, dan Custom Range.</span>
                  </div>
                )
              }
            />

            {/* Period filter */}
            <div className="rounded-2xl bg-muted/55 p-1 [scrollbar-width:none]">
              <div className="flex min-w-0 gap-1 overflow-x-auto">
              {([
                ['all', 'Semua'],
                ['today', 'Hari ini'],
                ['week', 'Minggu ini'],
                ['month', 'Bulan ini'],
                ['custom', 'Custom range'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPeriodFilter(value)}
                  className={`min-h-9 shrink-0 rounded-xl px-3.5 text-xs font-bold transition-all ${
                    periodFilter === value
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
              </div>
            </div>

            {periodFilter === 'custom' && (
              <div className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-elevation-1 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Mulai
                  <input
                    type="date"
                    value={customDraftStartDate}
                    onChange={(event) => setCustomDraftStartDate(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-finance focus:ring-2 focus:ring-finance/20"
                  />
                </label>
                <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Sampai
                  <input
                    type="date"
                    value={customDraftEndDate}
                    onChange={(event) => setCustomDraftEndDate(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-finance focus:ring-2 focus:ring-finance/20"
                  />
                </label>
                <Button type="button" size="sm" onClick={applyCustomRange} className="h-11 rounded-xl px-5">
                  Terapkan
                </Button>
              </div>
            )}

            {/* Search */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">Aktivitas</p>
              <span className="text-[11px] font-medium text-muted-foreground/65">
                {filteredTransactions.length} transaksi
              </span>
            </div>
            <SearchBar value={search} onChange={setSearch} placeholder="Cari transaksi..." />

            {/* Transaction list */}
            <div className="min-h-0 flex-1 min-w-0 overflow-x-hidden overflow-y-auto overscroll-contain -mx-1 px-1.5 pb-[calc(7rem+env(safe-area-inset-bottom))] [scrollbar-gutter:stable]">
              {loading ? (
                <PageLoading accent="keuangan" label="Memuat transaksi…" />
              ) : sortedDates.length === 0 ? (
                <PageEmpty
                  accent="keuangan"
                  icon={Wallet}
                      title={search ? 'Tidak ada hasil pencarian' : periodFilter === 'all' ? 'Belum ada transaksi' : 'Belum ada transaksi di periode ini'}
                  description={
                    search
                      ? 'Coba kata kunci lain atau hapus filter.'
                      : 'Catat pemasukan dan pengeluaran kamu agar keuangan tetap terpantau.'
                  }
                  cta={
                    !search ? (
                      <div className="flex flex-wrap justify-center gap-2">
                        <Button
                          onClick={() => handleOpenForm('expense')}
                          className="rounded-full bg-finance px-5 py-3 text-finance-text hover:bg-finance/90"
                        >
                          <ArrowUpRight size={16} strokeWidth={2.5} />
                          Pengeluaran
                        </Button>
                        <Button
                          onClick={() => handleOpenForm('income')}
                          variant="outline"
                          className="rounded-full border-income/30 px-5 py-3 text-income hover:bg-income/10"
                        >
                          <ArrowDownLeft size={16} strokeWidth={2.5} />
                          Pemasukan
                        </Button>
                      </div>
                    ) : undefined
                  }
                />
              ) : (
                <div className="space-y-6 pb-2">
                  {sortedDates.map((dateStr) => {
                    const dayTxs = groupedTx[dateStr];
                    const dayNet = dayTxs.reduce(
                      (acc, tx) => {
                        const amt = Number(tx.amount) || 0;
                        return tx.type === 'income' ? acc + amt : acc - amt;
                      },
                      0,
                    );

                    return (
                      <div key={dateStr}>
                        {/* Date row */}
                        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
                          <div className="flex items-center gap-2">
                            <CalendarDays
                              size={13}
                              strokeWidth={2.3}
                              className="text-muted-foreground/65 shrink-0"
                            />
                            <span className="text-xs font-bold text-foreground/75">
                              {getFormatDate(dateStr)}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              dayNet >= 0 ? 'text-income' : 'text-expense'
                            }`}
                          >
                            {dayNet >= 0 ? '+' : ''}
                            {formatRupiahCompact(dayNet)}
                          </span>
                        </div>

                        {/* Transaction group */}
                        <div className="overflow-hidden rounded-[1.25rem] border border-border/65 bg-card shadow-elevation-1">
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
                                      className="grid min-h-[4.5rem] grid-cols-[2.75rem_minmax(0,1fr)_minmax(4.75rem,34%)] items-center gap-x-2.5 px-3.5 py-3.5 transition-colors hover:bg-muted/20 active:bg-muted/40 select-none focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-finance sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(5rem,auto)] sm:gap-x-3.5 sm:px-4"
                                    >
                                      {/* Icon */}
                                      <div
                                          className={`flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-xl ${
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
                                        <p className="truncate text-sm font-bold leading-5 text-foreground">
                                          {tx.category}
                                        </p>
                                        <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                            <span className="shrink-0 text-[11px] font-medium text-muted-foreground/75">
                                            {tx.source}
                                          </span>
                                          {tx.note && (
                                            <>
                                              <span className="text-muted-foreground/30 text-[10px]">·</span>
                                                <span className="min-w-0 truncate text-[11px] text-muted-foreground/65">
                                                {tx.note}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Amount */}
                                      <div className="min-w-0 max-w-full shrink-0 overflow-hidden text-right">
                                        <p
                                          className={`break-words text-[clamp(11px,3.2vw,14px)] font-black tabular-nums leading-5 ${
                                            tx.type === 'income'
                                              ? 'text-income'
                                              : 'text-foreground'
                                          }`}
                                        >
                                          {tx.type === 'income' ? '+' : '−'}
                                          {formatRupiahCompact(tx.amount)}
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/55">
                                          {tx.type === 'income' ? 'masuk' : 'keluar'}
                                        </p>
                                      </div>
                                    </AnimatedListItem>
                                  </SwipeableTransactionRow>

                                  {/* Inset divider */}
                                  {i < arr.length - 1 && (
                                    <div className="ml-[3.75rem] border-b border-border/55" />
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

        </div>
      </div>

      {/* Voice recording — page-owned and floating above BottomSheetNav. */}
      <div className="pointer-events-auto fixed bottom-[calc(7.5rem+env(safe-area-inset-bottom))] right-3 z-[60] sm:right-6 lg:bottom-6">
        <VoiceRecordButton
          onTranscript={handleVoiceTranscript}
          className="flex-row-reverse rounded-full border border-finance/25 bg-card/95 py-1 pl-2 pr-1 shadow-elevation-2 backdrop-blur-xl sm:pl-3"
        />
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
            className="fixed bottom-0 left-0 right-0 z-50 flex min-h-0 max-h-[calc(100dvh-env(safe-area-inset-top))] flex-col overflow-hidden rounded-t-[1.75rem] border-t border-border/60 bg-card shadow-elevation-3 outline-none sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2"
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
                <div className="mb-5 grid grid-cols-1 min-[380px]:grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-3 min-[380px]:grid-cols-4 gap-2 sm:grid-cols-5">
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
