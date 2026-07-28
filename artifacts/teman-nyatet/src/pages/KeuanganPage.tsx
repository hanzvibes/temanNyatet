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
  ArrowDownRight,
  ArrowUpRight,
  PiggyBank,
  Plus,
  TrendingDown,
  TrendingUp,
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

// ─── Finance summary ──────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
  trend,
}: {
  label: string;
  value: number;
  caption: string;
  icon: typeof TrendingUp;
  tone: 'income' | 'expense' | 'savings';
  trend?: 'up' | 'down';
}) {
  const toneStyles = {
    income: {
      icon: 'bg-income/12 text-income',
      value: 'text-income',
    },
    expense: {
      icon: 'bg-expense/12 text-expense',
      value: 'text-foreground',
    },
    savings: {
      icon: 'bg-finance/15 text-finance-text',
      value: value >= 0 ? 'text-foreground' : 'text-expense',
    },
  }[tone];

  return (
    <div className="min-w-[172px] flex-1 rounded-[1.25rem] border border-card-border bg-card p-4 shadow-elevation-1 sm:min-w-0">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${toneStyles.icon}`}>
          <Icon size={17} strokeWidth={2.4} />
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${trend === 'up' ? 'text-income' : 'text-expense'}`}>
            {trend === 'up' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
            Bulan ini
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-lg font-extrabold tracking-[-0.03em] tabular-nums ${toneStyles.value}`}>
        {formatRupiah(value)}
      </p>
      <p className="mt-1 text-[11px] font-medium text-muted-foreground/75">{caption}</p>
    </div>
  );
}

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
      className="relative overflow-hidden rounded-[1.5rem] border border-finance/20 bg-card p-5 shadow-elevation-2 sm:p-6"
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full opacity-[0.08]"
        style={{
          background: 'radial-gradient(circle, hsl(var(--finance)) 0%, transparent 68%)',
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Total saldo</p>
            <p className="mt-1 text-xs font-medium text-muted-foreground/75">Saldo seluruh akun</p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-finance/15 text-finance-text">
            <Wallet size={19} strokeWidth={2.3} />
          </div>
        </div>
        <motion.h2
          key={balance}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="mt-5 truncate text-[clamp(2rem,5vw,2.75rem)] font-extrabold tracking-[-0.055em] text-foreground tabular-nums"
        >
          {formatRupiah(balance)}
        </motion.h2>
        <div className="mt-6 border-t border-border/70 pt-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-foreground">
              <Activity size={15} className="text-finance-text" />
              Cash flow bulan ini
            </span>
            <span className={`text-xs font-extrabold tabular-nums ${net >= 0 ? 'text-income' : 'text-expense'}`}>
              {net >= 0 ? '+' : '-'}{formatRupiah(Math.abs(net))}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-expense/15">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${incomeRatio}%` }}
              transition={{ duration: 0.65, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              className="h-full rounded-full bg-income"
            />
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Pemasukan {incomeRatio}%</span>
            <span>Pengeluaran {100 - incomeRatio}%</span>
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

          <div className="-mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible lg:grid-cols-2">
            <MetricCard
              label="Pemasukan"
              value={monthlySummary.income}
              caption="Total bulan ini"
              icon={TrendingUp}
              tone="income"
              trend="up"
            />
            <MetricCard
              label="Pengeluaran"
              value={monthlySummary.expense}
              caption="Total bulan ini"
              icon={TrendingDown}
              tone="expense"
              trend="down"
            />
            <MetricCard
              label="Tabungan"
              value={monthlySummary.income - monthlySummary.expense}
              caption="Sisa pemasukan bulan ini"
              icon={PiggyBank}
              tone="savings"
            />
            <MetricCard
              label="Cash flow"
              value={monthlySummary.income - monthlySummary.expense}
              caption="Pemasukan dikurangi pengeluaran"
              icon={Activity}
              tone="savings"
            />
          </div>
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
              <div className="space-y-5">
                {sortedDates.map((dateStr) => (
                  <div key={dateStr}>
                    <h3 className="mb-2.5 px-1 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground sm:text-sm sm:tracking-widest">
                      {getFormatDate(dateStr)}
                    </h3>
                    <div className="space-y-2.5">
                      <AnimatePresence>
                        {groupedTx[dateStr].map((tx) => (
                          <SwipeableTransactionRow
                            key={tx.id}
                            transactionId={tx.id}
                            isDeleting={deletingId === tx.id}
                            onDelete={handleSwipeDelete}
                          >
                            <AnimatedListItem
                              tabIndex={0}
                              role="group"
                              aria-label={`Transaksi ${tx.category} ${formatRupiah(tx.amount)}`}
                              className="flex min-h-[4.25rem] items-center justify-between overflow-hidden rounded-[1.15rem] border border-card-border bg-card p-3 shadow-sm transition-all hover:border-finance/30 hover:shadow-md active:scale-[0.99] select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance focus-visible:ring-offset-2 sm:min-h-0 sm:rounded-[1.25rem] sm:p-4"
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                <div
                                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${getCategoryColor(tx.type)}`}
                                >
                                  {(() => {
                                    const Icon = CATEGORY_ICON[tx.category] ?? FALLBACK_CATEGORY_ICON;
                                    return (
                                      <Icon
                                        size={18}
                                        className="text-white"
                                        strokeWidth={2.5}
                                      />
                                    );
                                  })()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="font-bold text-foreground text-sm mb-0.5 truncate">
                                    {tx.category}
                                  </p>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-secondary text-muted-foreground rounded-md border border-border shrink-0">
                                      {tx.source}
                                    </span>
                                    {tx.note && (
                                      <span className="text-[11px] font-medium text-muted-foreground/70 truncate">
                                        {tx.note}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div
                                className={`ml-3 shrink-0 text-sm font-extrabold tabular-nums sm:text-base ${
                                  tx.type === 'income'
                                    ? 'text-income'
                                    : 'text-foreground'
                                }`}
                              >
                                {tx.type === 'income' ? '+' : '-'}
                                {formatRupiah(tx.amount)}
                              </div>
                            </AnimatedListItem>
                          </SwipeableTransactionRow>
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>
          <aside className="order-1 hidden rounded-[1.25rem] border border-card-border bg-card p-5 shadow-elevation-1 lg:order-2 lg:block">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Ringkasan bulan</p>
                <p className="mt-1 text-sm font-bold text-foreground">{format(new Date(), 'MMMM yyyy', { locale: id })}</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-finance/15 text-finance-text">
                <Activity size={17} />
              </div>
            </div>
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pemasukan</span>
                <span className="font-bold text-income tabular-nums">{formatRupiah(monthlySummary.income)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pengeluaran</span>
                <span className="font-bold text-expense tabular-nums">{formatRupiah(monthlySummary.expense)}</span>
              </div>
              <div className="border-t border-border/70 pt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-bold text-foreground">Sisa bulan ini</span>
                  <span className={`font-extrabold tabular-nums ${monthlySummary.income - monthlySummary.expense >= 0 ? 'text-foreground' : 'text-expense'}`}>
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
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-sheet h-[90dvh] landscape:h-[90dvh] sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full z-50 outline-none border-t border-border/70 shadow-elevated">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-6 mt-4" />

            <form
              onSubmit={form.handleSubmit(onSubmitForm)}
              className="flex flex-col px-5 sm:px-6 pb-8 overflow-y-auto"
            >
              {/* Type Toggle */}
              <div className="flex bg-muted/60 p-1 rounded-[1.25rem] mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setTxType('expense');
                    form.setValue('type', 'expense');
                    form.setValue('category', '');
                  }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
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
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                    txType === 'income'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount */}
              <div className="mb-6">
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
                    className="w-full text-4xl font-bold bg-card border border-border rounded-[1.5rem] py-5 pl-16 pr-5 outline-none focus:border-finance focus:ring-2 focus:ring-finance/20 transition-all text-foreground shadow-sm"
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
              <div className="flex gap-4 mb-6">
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
              <div className="mb-6">
                <label className="text-pill-label mb-3 block">Kategori</label>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
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
              <div className="mb-8">
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

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full bg-finance text-finance-text hover:bg-finance/90 text-base font-bold py-4 rounded-[1.25rem] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {form.formState.isSubmitting ? 'Menyimpan…' : 'Simpan Transaksi'}
              </Button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
