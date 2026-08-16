import { AnimatePresence } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, CalendarDays, Wallet } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SwipeableTransactionRow } from '@/components/SwipeableTransactionRow';
import { FormError, PageEmpty, PageLoading } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
import { CATEGORY_ICON, FALLBACK_CATEGORY_ICON } from '@/lib/categoryIcons';
import type { Transaction, TransactionType } from '@/lib/database.types';
import { formatRupiah, formatRupiahCompact } from '@/lib/transactions';

interface TransactionListProps {
  loading: boolean;
  search: string;
  periodFilter: 'all' | 'today' | 'week' | 'month' | 'custom';
  filteredTransactions: Transaction[];
  groupedTransactions: Record<string, Transaction[]>;
  sortedDates: string[];
  deletingId: string | null;
  onOpenForm: (type: TransactionType) => void;
  onDelete: (id: string) => void;
}

function getFormatDate(dateStr: string) {
  const date = new Date(dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr);
  if (isToday(date)) return 'Hari Ini';
  if (isYesterday(date)) return 'Kemarin';
  return format(date, 'd MMMM yyyy', { locale: id });
}

export default function TransactionList({
  loading,
  search,
  periodFilter,
  filteredTransactions,
  groupedTransactions,
  sortedDates,
  deletingId,
  onOpenForm,
  onDelete,
}: TransactionListProps) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Aktivitas</p>
        <span className="text-[11px] font-medium text-muted-foreground">
          {filteredTransactions.length} transaksi
        </span>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain -mx-1 px-1.5 pb-[calc(7rem+env(safe-area-inset-bottom))] [scrollbar-gutter:stable]">
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
                    onClick={() => onOpenForm('expense')}
                    className="rounded-full bg-finance px-5 py-3 text-finance-text hover:bg-finance/90"
                  >
                    <ArrowUpRight size={16} strokeWidth={2.5} />
                    Pengeluaran
                  </Button>
                  <Button
                    onClick={() => onOpenForm('income')}
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
              const dayTransactions = groupedTransactions[dateStr];
              const dayNet = dayTransactions.reduce((acc, tx) => {
                const amount = Number(tx.amount) || 0;
                return tx.type === 'income' ? acc + amount : acc - amount;
              }, 0);

              return (
                <div key={dateStr}>
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
                    <div className="flex items-center gap-2">
                      <CalendarDays size={13} strokeWidth={2.3} className="shrink-0 text-muted-foreground/65" />
                      <span className="text-xs font-bold text-foreground/75">{getFormatDate(dateStr)}</span>
                    </div>
                    <span className={`font-mono text-xs font-medium tabular-nums ${dayNet >= 0 ? 'text-income' : 'text-expense'}`}>
                      {dayNet >= 0 ? '+' : ''}{formatRupiahCompact(dayNet)}
                    </span>
                  </div>

                  <div className="overflow-hidden rounded-[1.25rem] border border-border/65 bg-card shadow-elevation-1">
                    <AnimatePresence>
                      {dayTransactions.map((tx, index, transactions) => {
                        const Icon = CATEGORY_ICON[tx.category] ?? FALLBACK_CATEGORY_ICON;
                        return (
                          <div key={tx.id}>
                            <SwipeableTransactionRow
                              transactionId={tx.id}
                              isDeleting={deletingId === tx.id}
                              onDelete={onDelete}
                              className="relative overflow-hidden"
                            >
                              <AnimatedListItem
                                tabIndex={0}
                                role="group"
                                aria-label={`Transaksi ${tx.category} ${formatRupiah(tx.amount)}`}
                                className="grid min-h-[4.5rem] grid-cols-[2.75rem_minmax(0,1fr)_minmax(4.75rem,34%)] items-center gap-x-2.5 px-3.5 py-3.5 transition-colors hover:bg-muted/20 active:bg-muted/40 select-none focus-visible:outline-none focus-visible:ring-inset focus-visible:ring-2 focus-visible:ring-finance sm:grid-cols-[2.75rem_minmax(0,1fr)_minmax(5rem,auto)] sm:gap-x-3.5 sm:px-4"
                              >
                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-xl ${tx.type === 'income' ? 'bg-income/10' : 'bg-expense/8'}`}>
                                  <Icon
                                    size={18}
                                    strokeWidth={2}
                                    className={tx.type === 'income' ? 'text-income' : 'text-expense'}
                                  />
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-bold leading-5 text-foreground">{tx.category}</p>
                                  <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
                                    <span className="shrink-0 text-[11px] font-medium text-muted-foreground">{tx.source}</span>
                                    {tx.note && (
                                      <>
                                        <span className="text-[10px] text-muted-foreground/30">·</span>
                                        <span className="min-w-0 truncate text-[11px] text-muted-foreground">{tx.note}</span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="min-w-0 max-w-full shrink-0 overflow-hidden text-right">
                                  <p className={`break-words font-mono text-[clamp(11px,3.2vw,14px)] font-semibold tabular-nums leading-5 ${tx.type === 'income' ? 'text-income' : 'text-foreground'}`}>
                                    {tx.type === 'income' ? '+' : '−'}{formatRupiahCompact(tx.amount)}
                                  </p>
                                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/55">
                                    {tx.type === 'income' ? 'masuk' : 'keluar'}
                                  </p>
                                </div>
                              </AnimatedListItem>
                            </SwipeableTransactionRow>
                            {index < transactions.length - 1 && (
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
    </>
  );
}