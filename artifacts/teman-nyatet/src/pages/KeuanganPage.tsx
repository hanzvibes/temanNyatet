import React, { useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SwipeableTransactionRow } from '@/components/SwipeableTransactionRow';
import SettingsSheet from '@/components/SettingsSheet';
import { useCreate } from '@/contexts/CreateContext';
import { useTransactions } from '@/hooks/useTransactions';
import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import { Wallet, Plus } from 'lucide-react';
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

// ─── Icons ────────────────────────────────────────────────────────────────────
const ArrowUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5" />
    <path d="M5 12 12 5l7 7" />
  </svg>
);

const ArrowDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <path d="m19 12-7 7-7-7" />
  </svg>
);

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-card rounded-[1.5rem] p-6 shadow-elevation-2 border border-card-border relative overflow-hidden"
    >
      {/* Subtle decorative gradient */}
      <div
        className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-[0.04] pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, hsl(var(--finance)) 0%, transparent 70%)',
        }}
      />

      <div className="flex flex-col items-center mb-6 relative">
        <p className="text-pill-label mb-2">Total saldo</p>
        <motion.h2
          key={balance}
          initial={{ opacity: 0.4, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-4xl font-extrabold text-foreground tracking-[-0.04em] tabular-nums"
        >
          {formatRupiah(balance)}
        </motion.h2>
      </div>

      <div className="flex gap-4">
        <motion.div
          whileTap={{ scale: 0.97 }}
          className="flex-1 bg-income/10 rounded-xl p-4 flex flex-col items-center border border-income/20"
        >
          <div className="flex items-center gap-1.5 text-income mb-2">
            <ArrowUpIcon />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Pemasukan
            </span>
          </div>
          <span className="font-bold text-income tabular-nums">
            {formatRupiah(income)}
          </span>
        </motion.div>

        <motion.div
          whileTap={{ scale: 0.97 }}
          className="flex-1 bg-expense/10 rounded-xl p-4 flex flex-col items-center border border-expense/20"
        >
          <div className="flex items-center gap-1.5 text-expense mb-2">
            <ArrowDownIcon />
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Pengeluaran
            </span>
          </div>
          <span className="font-bold text-expense tabular-nums">
            {formatRupiah(expense)}
          </span>
        </motion.div>
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

  const filteredTransactions = transactions.filter((tx) => {
    if (!search) return true;
    const l = search.toLowerCase();
    return (
      tx.category.toLowerCase().includes(l) ||
      (tx.note && tx.note.toLowerCase().includes(l))
    );
  });

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

  const groupedTx = filteredTransactions.reduce(
    (acc, tx) => {
      const d = tx.date;
      if (!acc[d]) acc[d] = [];
      acc[d].push(tx);
      return acc;
    },
    {} as Record<string, typeof transactions>,
  );

  const sortedDates = Object.keys(groupedTx).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  const handleSwipeDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTransaction(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-dvh pb-32 lg:pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="px-5 py-5 pb-4 space-y-4 sm:px-6 lg:px-10 lg:py-7 lg:pb-5 max-w-screen-xl mx-auto">
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

      {/* Desktop: two-column, mobile: stacked */}
      <div
        className="px-5 sm:px-6 lg:px-10 max-w-screen-xl mx-auto w-full
                      space-y-6 lg:space-y-0
                      lg:grid lg:grid-cols-[360px_1fr] lg:gap-10 lg:items-start lg:pt-7 lg:pb-8"
      >
        {/* ── Left column: balance card ── */}
        <div className="space-y-6 lg:sticky lg:top-6 pt-4 lg:pt-0">
          <BalanceCard
            balance={monthlySummary.balance}
            income={monthlySummary.income}
            expense={monthlySummary.expense}
          />
        </div>

        {/* ── Right column: search + list ── */}
        <div className="space-y-6 pt-0 lg:pt-0 pb-8 lg:pb-0">
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
                {sortedDates.map((dateStr) => (
                  <div key={dateStr}>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3 px-1">
                      {getFormatDate(dateStr)}
                    </h3>
                    <div className="space-y-3">
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
                              className="bg-card rounded-[1.25rem] p-4 flex items-center justify-between shadow-sm border border-card-border hover:border-finance/30 hover:shadow-md transition-all active:scale-[0.98] select-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-finance focus-visible:ring-offset-2"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div
                                  className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm shrink-0 ${getCategoryColor(tx.type)}`}
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
                                className={`font-extrabold text-base tabular-nums shrink-0 ml-3 ${
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
      </div>

      {/* ── Form Sheet ── */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-sheet h-[90dvh] landscape:h-[75dvh] sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full z-50 outline-none border-t border-border/70 shadow-elevated">
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
                className="w-full bg-finance text-finance-text hover:bg-finance/90 text-base font-bold py-4 rounded-[1.25rem]"
              >
                Simpan Transaksi
              </Button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
