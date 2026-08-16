import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { formatRupiah, formatRupiahCompact } from '@/lib/transactions';

interface BalanceHeroProps {
  balance: number;
  income: number;
  expense: number;
  aiSummary?: React.ReactNode;
}

export default function BalanceHero({
  balance,
  income,
  expense,
  aiSummary,
}: BalanceHeroProps) {
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
      className="relative overflow-hidden rounded-[1.75rem] border border-finance/25 bg-card p-5 shadow-elevation-2 sm:p-6"
    >
      <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-finance/10 blur-2xl" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
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
          className="mt-5 max-w-full break-words font-mono text-[clamp(1.85rem,10vw,3.5rem)] font-bold leading-[1] tracking-[-0.045em] text-foreground tabular-nums"
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
            <p className="mt-2 truncate font-mono text-sm font-bold tabular-nums text-foreground">
              {formatRupiahCompact(income)}
            </p>
          </div>
          <div className="rounded-2xl bg-expense/[0.07] px-3.5 py-3">
            <div className="flex items-center gap-2 text-expense">
              <ArrowUpRight size={15} strokeWidth={2.5} />
              <span className="text-[10px] font-bold uppercase tracking-[0.13em]">Pengeluaran</span>
            </div>
            <p className="mt-2 truncate font-mono text-sm font-bold tabular-nums text-foreground">
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
          <div className="mt-1.5 flex justify-between text-[10px] font-semibold text-muted-foreground">
            <span>Pemasukan</span>
            <span>{100 - incomeRatio}% pengeluaran</span>
          </div>
        </div>

        {aiSummary}
      </div>
    </motion.section>
  );
}