import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import SettingsSheet from '@/components/SettingsSheet';
import TransactionFormSheet from '@/components/TransactionFormSheet';
import { useCreate } from '@/contexts/CreateContext';
import { useTransactions } from '@/hooks/useTransactions';
import {
  endOfMonth,
  endOfWeek,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TransactionType } from '@/lib/database.types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import SearchBar from '@/components/SearchBar';
import VoiceRecordButton from '@/components/VoiceRecordButton';
import TransactionSummaryCard from '@/components/TransactionSummaryCard';
import BalanceHero from '@/components/BalanceHero';
import TransactionList from '@/components/TransactionList';
import TransactionPeriodFilter, { type PeriodFilter } from '@/components/TransactionPeriodFilter';
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
  parseTransactionAmount,
  transactionFormSchema,
  createTransactionFormDefaults,
  type TransactionFormValues,
} from '@/lib/transactions';
import { requestBottomSheet, requestSettingsTopUp } from '@/lib/app-events';

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

            <TransactionPeriodFilter
              value={periodFilter}
              customStartDate={customDraftStartDate}
              customEndDate={customDraftEndDate}
              onChange={setPeriodFilter}
              onCustomStartDateChange={setCustomDraftStartDate}
              onCustomEndDateChange={setCustomDraftEndDate}
              onApplyCustomRange={applyCustomRange}
            />

            <SearchBar value={search} onChange={setSearch} placeholder="Cari transaksi..." />
            <TransactionList
              loading={loading}
              search={search}
              periodFilter={periodFilter}
              filteredTransactions={filteredTransactions}
              groupedTransactions={groupedTx}
              sortedDates={sortedDates}
              deletingId={deletingId}
              onOpenForm={handleOpenForm}
              onDelete={handleSwipeDelete}
            />
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

      <TransactionFormSheet
        open={isFormOpen}
        type={txType}
        viewportHeight={sheetViewportHeight}
        form={form}
        onOpenChange={setIsFormOpen}
        onTypeChange={setTxType}
        onSubmit={onSubmitForm}
      />
    </div>
  );
}
