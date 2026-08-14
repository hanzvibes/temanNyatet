import { Button } from '@/components/ui/button';

export type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';

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
          ] as const).map(([filterValue, label]) => (
            <button
              key={filterValue}
              type="button"
              onClick={() => onChange(filterValue)}
              className={`min-h-11 shrink-0 rounded-xl px-3.5 text-xs font-bold transition-all ${
                value === filterValue
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-card/60 hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {value === 'custom' && (
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
      )}
    </>
  );
}