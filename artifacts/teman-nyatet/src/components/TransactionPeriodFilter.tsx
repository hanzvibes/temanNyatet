import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

export type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

// Spring for the gliding selection pill — light mass, near-critical damping so
// it tracks the finger without overshooting into a visible bounce.
const PILL_TRANSITION = { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 } as const;

interface TransactionPeriodFilterProps {
  value: PeriodFilter;
  customStartDate: string;
  customEndDate: string;
  onChange: (value: PeriodFilter) => void;
  onCustomStartDateChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
  onApplyCustomRange: () => void;
}

export default function TransactionPeriodFilter({
  value,
  customStartDate,
  customEndDate,
  onChange,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onApplyCustomRange,
}: TransactionPeriodFilterProps) {
  const reducedMotion = usePrefersReducedMotion();
  return (
    <>
      <div className="rounded-2xl bg-muted/55 p-1 [scrollbar-width:none]">
        <div className="flex min-w-0 gap-1 overflow-x-auto">
          {([
            ['all', 'Semua'],
            ['today', 'Hari ini'],
            ['week', 'Minggu ini'],
            ['month', 'Bulan ini'],
            ['custom', 'Custom range'],
          ] as const).map(([filterValue, label]) => {
            const isActive = value === filterValue;
            return (
              <button
                key={filterValue}
                type="button"
                onClick={() => onChange(filterValue)}
                aria-pressed={isActive}
                className="relative min-h-11 shrink-0 rounded-xl px-3.5 text-xs font-bold transition-colors select-none active:scale-[0.96]"
              >
                {isActive && (
                  <motion.span
                    layoutId="period-filter-pill"
                    className="absolute inset-0 rounded-xl bg-card shadow-sm"
                    transition={reducedMotion ? { duration: 0 } : PILL_TRANSITION}
                  />
                )}
                <span
                  className={`relative z-10 block transition-colors ${
                    isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {value === 'custom' && (
          <motion.div
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-elevation-1 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Mulai
            <input
              type="date"
              value={customStartDate}
              onChange={(event) => onCustomStartDateChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-finance focus:ring-2 focus:ring-finance/20"
            />
          </label>
          <label className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Sampai
            <input
              type="date"
              value={customEndDate}
              onChange={(event) => onCustomEndDateChange(event.target.value)}
              className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground outline-none focus:border-finance focus:ring-2 focus:ring-finance/20"
            />
          </label>
          <Button type="button" size="sm" onClick={onApplyCustomRange} className="h-11 rounded-xl px-5">
            Terapkan
          </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}