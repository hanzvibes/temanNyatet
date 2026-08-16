import { useState } from 'react';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type {
  TransactionSummary,
  TransactionSummaryPeriod,
} from '@/lib/transaction-summary';

const formatRupiah = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);

const periodLabel: Record<TransactionSummaryPeriod['periodType'], string> = {
  week: 'Minggu ini',
  month: 'Bulan ini',
  custom: 'Rentang pilihan',
};

function formatChange(value: number | null): string {
  if (value === null) return 'Belum ada pembanding';
  return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
}

type Props = {
  period: TransactionSummaryPeriod;
  summary: TransactionSummary | null;
  variant?: 'default' | 'hero';
  loading: boolean;
  generating: boolean;
  loadError: string | null;
  generateError: string | null;
  empty: boolean;
  balance: number | null;
  onGenerate: () => Promise<void>;
  onRetryLoad: () => Promise<void>;
  onOpenTopUp: () => void;
};

function SummaryDetails({
  summary,
  balance,
  generating,
  onRegenerate,
}: {
  summary: TransactionSummary;
  balance: number | null;
  generating: boolean;
  onRegenerate: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-black leading-snug text-foreground">{summary.headline}</p>
        <p className="mt-1 text-[11px] font-medium text-muted-foreground">
          Dibandingkan {summary.comparison_start} – {summary.comparison_end}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-income/8 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-income/75">Pemasukan</p>
          <p className="mt-1 font-mono text-sm font-bold tabular-nums text-income">{formatRupiah(summary.totals.income)}</p>
        </div>
        <div className="rounded-xl bg-expense/8 px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-expense/75">Pengeluaran</p>
          <p className="mt-1 font-mono text-sm font-bold tabular-nums text-expense">{formatRupiah(summary.totals.expense)}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.13em] text-muted-foreground">
            Top kategori pengeluaran
          </p>
          <div className="space-y-2">
            {summary.top_expense_categories.length > 0 ? summary.top_expense_categories.map((category) => (
              <div key={category.category} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-semibold text-foreground">{category.category}</span>
                <span className="shrink-0 font-mono font-medium tabular-nums text-muted-foreground">
                  {formatRupiah(category.amount)} · {category.percentage.toFixed(1)}%
                </span>
              </div>
            )) : <span className="text-xs text-muted-foreground">Belum ada pengeluaran.</span>}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.13em] text-muted-foreground">
            Perbandingan
          </p>
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Pemasukan</span>
              <span className="font-bold tabular-nums">{formatChange(summary.comparison.income_change_percent)}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Pengeluaran</span>
              <span className="font-bold tabular-nums">{formatChange(summary.comparison.expense_change_percent)}</span>
            </div>
            <span className="inline-flex items-center gap-1 font-bold text-primary">
              {summary.comparison.direction === 'down' ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
              {summary.comparison.direction === 'unavailable'
                ? 'Belum ada pembanding'
                : `Arah aktivitas: ${summary.comparison.direction === 'up' ? 'naik' : summary.comparison.direction === 'down' ? 'turun' : 'sama'}`}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-secondary/55 px-3.5 py-3">
        <ul className="space-y-1.5 text-xs leading-relaxed text-foreground/80">
          {summary.insights.map((insight) => <li key={insight}>• {insight}</li>)}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-[11px] font-semibold text-muted-foreground">
          {balance !== null ? `${balance} credit tersisa` : '1 credit digunakan saat generate'}
        </span>
        <Button type="button" size="sm" variant="outline" onClick={onRegenerate} disabled={generating}>
          {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Generate ulang
        </Button>
      </div>
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div
      className="space-y-4 py-4"
      role="status"
      aria-live="polite"
      aria-label="Memuat ringkasan keuangan"
    >
      <div className="space-y-2">
        <div className="h-4 w-11/12 animate-pulse rounded-full bg-muted" />
        <div className="h-3 w-2/5 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-16 animate-pulse rounded-xl bg-income/10" />
        <div className="h-16 animate-pulse rounded-xl bg-expense/10" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-4/5 animate-pulse rounded-full bg-muted" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-full animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function TransactionSummaryCard({
  period,
  summary,
  variant = 'default',
  loading,
  generating,
  loadError,
  generateError,
  empty,
  balance,
  onGenerate,
  onRetryLoad,
  onOpenTopUp,
}: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const hasSummary = Boolean(summary);
  const isHero = variant === 'hero';

  const requestGenerate = async () => {
    setConfirmOpen(false);
    await onGenerate();
  };

  return (
    <>
      {isHero ? (
        <section
          aria-labelledby="transaction-summary-title"
          className="relative mt-5 overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.055] px-3.5 py-3 sm:px-4"
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-24 w-24 rounded-full bg-primary/12 blur-2xl" />
          <div className="relative flex min-h-10 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
              <Sparkles size={15} strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-primary/80">AI insight</p>
                <span className="h-1 w-1 rounded-full bg-primary/40" />
                <span className="truncate text-[10px] font-bold text-muted-foreground">{periodLabel[period.periodType]}</span>
              </div>
              {loading ? (
                <div className="mt-2 space-y-1.5" role="status" aria-label="Memuat ringkasan AI">
                  <div className="h-2.5 w-32 animate-pulse rounded-full bg-primary/20" />
                  <div className="h-2.5 w-20 animate-pulse rounded-full bg-primary/10" />
                </div>
              ) : loadError || (generateError && !summary) ? (
                <p className="mt-0.5 truncate text-xs font-semibold text-destructive">
                  Gagal memuat ringkasan
                </p>
              ) : empty ? (
                <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                  Belum ada transaksi untuk dianalisis
                </p>
              ) : summary ? (
                <p className="mt-0.5 line-clamp-2 text-xs font-bold leading-snug text-foreground">
                  {summary.headline}
                </p>
              ) : (
                <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">
                  Temukan pola dari aktivitasmu
                </p>
              )}
            </div>
            {loadError ? (
              <Button type="button" size="sm" variant="ghost" onClick={onRetryLoad} disabled={loading} className="min-h-11 shrink-0 px-3 text-xs">
                Coba lagi
              </Button>
            ) : generateError ? (
              <Button type="button" size="sm" variant="ghost" onClick={onGenerate} disabled={generating} className="min-h-11 shrink-0 px-3 text-xs">
                Coba lagi
              </Button>
            ) : summary ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => setDetailsOpen(true)} className="min-h-11 shrink-0 px-3 text-xs font-black text-primary hover:bg-primary/10">
                Detail
              </Button>
            ) : !empty ? (
              <Button type="button" size="sm" variant="ghost" onClick={onGenerate} disabled={generating} className="min-h-11 shrink-0 px-3 text-xs font-black text-primary hover:bg-primary/10">
                Buat
              </Button>
            ) : null}
          </div>
          {generateError === 'CREDITS_EXHAUSTED' && (
            <button type="button" onClick={onOpenTopUp} className="relative mt-1 pl-[2.625rem] text-[10px] font-bold text-primary underline underline-offset-4">
              Top Up AI Credit
            </button>
          )}
        </section>
      ) : (
      <section
        aria-labelledby="transaction-summary-title"
        className="relative mb-5 overflow-hidden rounded-2xl border border-primary/15 bg-primary/[0.035] shadow-sm"
      >
        <div className="relative flex items-start justify-between gap-3 px-4 py-4 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles size={17} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-primary/80">
                Ringkasan AI
              </p>
              <h2 id="transaction-summary-title" className="mt-1 text-sm font-black text-foreground">
                {periodLabel[period.periodType]}
              </h2>
            </div>
          </div>
          {hasSummary && (
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-bold text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              aria-expanded={!collapsed}
            >
              {collapsed ? 'Tampilkan' : 'Sembunyikan'}
              {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          )}
        </div>

        {loading && (
          <div className="relative border-t border-primary/15 px-4 sm:px-5">
            <SummarySkeleton />
          </div>
        )}

        {!loading && !collapsed && (
          <div className="relative border-t border-primary/15 px-4 pb-4 sm:px-5 sm:pb-5">
            {loadError ? (
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-sm font-medium text-destructive">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {loadError}
                </p>
                <Button type="button" size="sm" variant="outline" onClick={onRetryLoad} disabled={loading}>
                  Coba lagi
                </Button>
              </div>
            ) : generateError && !summary ? (
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-sm font-medium text-destructive">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {generateError}
                </p>
                <Button type="button" size="sm" variant="outline" onClick={onGenerate} disabled={generating}>
                  Coba lagi
                </Button>
              </div>
            ) : empty ? (
              <p className="py-4 text-sm leading-relaxed text-muted-foreground">
                Belum ada transaksi pada periode ini. Tambahkan transaksi terlebih dahulu agar AI bisa menemukan pola yang nyata.
              </p>
              ) : summary ? (
                <div className="pt-4">
                  <SummaryDetails
                    summary={summary}
                    balance={balance}
                    generating={generating}
                    onRegenerate={() => setConfirmOpen(true)}
                  />
                </div>
            ) : (
              <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                  Dapatkan pola pemasukan, pengeluaran, dan kategori teratas. Setiap generate menggunakan 1 credit.
                </p>
                <Button type="button" onClick={onGenerate} disabled={generating} className="shrink-0">
                  {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  Ringkas dengan AI
                </Button>
              </div>
            )}
            {generateError === 'CREDITS_EXHAUSTED' && (
              <button type="button" onClick={onOpenTopUp} className="mt-2 text-xs font-bold text-primary underline underline-offset-4">
                Top Up AI Credit
              </button>
            )}
          </div>
        )}
      </section>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Generate ulang ringkasan?</AlertDialogTitle>
            <AlertDialogDescription>
              Generate ulang akan menggunakan 1 credit lagi untuk periode ini. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={requestGenerate}>Lanjutkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isHero && summary && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-[calc(100%-2rem)] rounded-[1.5rem] border-border/70 bg-card p-5 shadow-elevation-3 sm:max-w-lg sm:p-6">
            <DialogHeader className="pr-6 text-left">
              <DialogTitle className="flex items-center gap-2 text-lg font-black">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles size={15} />
                </span>
                Ringkasan AI · {periodLabel[period.periodType]}
              </DialogTitle>
              <DialogDescription>
                Insight dari aktivitas keuangan pada periode ini.
              </DialogDescription>
            </DialogHeader>
            <SummaryDetails
              summary={summary}
              balance={balance}
              generating={generating}
              onRegenerate={() => {
                setDetailsOpen(false);
                setConfirmOpen(true);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}