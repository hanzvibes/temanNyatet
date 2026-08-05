import { Drawer } from 'vaul';
import type { UseFormReturn } from 'react-hook-form';
import { CATEGORY_ICON, FALLBACK_CATEGORY_ICON } from '@/lib/categoryIcons';
import { FormError } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
import type { TransactionType } from '@/lib/database.types';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_PAYMENT_SOURCES,
  type TransactionFormValues,
} from '@/lib/transactions';

const INP =
  'w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:border-finance focus:ring-2 focus:ring-finance/20 text-sm font-semibold text-foreground transition-all placeholder:text-muted-foreground/50';

interface TransactionFormSheetProps {
  open: boolean;
  type: TransactionType;
  viewportHeight: number;
  form: UseFormReturn<TransactionFormValues>;
  onOpenChange: (open: boolean) => void;
  onTypeChange: (type: TransactionType) => void;
  onSubmit: (data: TransactionFormValues) => void | Promise<void>;
}

export default function TransactionFormSheet({
  open,
  type,
  viewportHeight,
  form,
  onOpenChange,
  onTypeChange,
  onSubmit,
}: TransactionFormSheetProps) {
  const categories = type === 'expense'
    ? DEFAULT_EXPENSE_CATEGORIES
    : DEFAULT_INCOME_CATEGORIES;
  const selectedCategory = form.watch('category');

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
        <Drawer.Content
          style={{
            height: `${Math.min(Math.max(viewportHeight * 0.92, 360), 720)}px`,
            maxHeight: 'calc(100dvh - env(safe-area-inset-top))',
          }}
          className="fixed bottom-0 left-0 right-0 z-50 flex min-h-0 max-h-[calc(100dvh-env(safe-area-inset-top))] flex-col overflow-hidden rounded-t-[1.75rem] border-t border-border/60 bg-card shadow-elevation-3 outline-none sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2"
        >
          <div className="mx-auto mb-1 mt-3.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
              <div className="my-5 flex rounded-[1rem] bg-muted/50 p-1">
                {(['expense', 'income'] as const).map((transactionType) => (
                  <button
                    key={transactionType}
                    type="button"
                    onClick={() => {
                      onTypeChange(transactionType);
                      form.setValue('type', transactionType);
                      form.setValue('category', '');
                    }}
                    className={`min-h-10 flex-1 rounded-[0.75rem] py-2.5 text-sm font-bold transition-all ${
                      type === transactionType
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground/80'
                    }`}
                  >
                    {transactionType === 'expense' ? 'Pengeluaran' : 'Pemasukan'}
                  </button>
                ))}
              </div>

              <div className="mb-5">
                <label className="text-pill-label mb-2.5 block">Nominal</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 select-none text-xl font-bold text-muted-foreground/40">
                    Rp
                  </span>
                  <input
                    {...form.register('amount')}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full min-w-0 rounded-[1.25rem] border border-border bg-background py-4 pl-12 pr-4 text-[clamp(1.75rem,8vw,2.25rem)] font-black tracking-[-0.03em] text-foreground outline-none transition-all focus:border-finance focus:ring-2 focus:ring-finance/20 sm:py-5 sm:pl-13"
                    onChange={(event) => {
                      const value = event.target.value.replace(/\D/g, '');
                      const formatted = value
                        ? new Intl.NumberFormat('id-ID').format(Number(value))
                        : '';
                      form.setValue('amount', formatted, { shouldValidate: true });
                    }}
                  />
                </div>
                {form.formState.errors.amount && (
                  <FormError className="ml-1 mt-2" size="xs">
                    {form.formState.errors.amount.message as string}
                  </FormError>
                )}
              </div>

              <div className="mb-5 grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
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
                  <select {...form.register('source')} className={`${INP} appearance-none`}>
                    {DEFAULT_PAYMENT_SOURCES.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-5">
                <label className="text-pill-label mb-3 block">Kategori</label>
                <div className="grid grid-cols-3 gap-2 min-[380px]:grid-cols-4 sm:grid-cols-5">
                  {categories.map((category) => {
                    const isSelected = selectedCategory === category;
                    const Icon = CATEGORY_ICON[category] ?? FALLBACK_CATEGORY_ICON;
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => form.setValue('category', category, { shouldValidate: true })}
                        className={`flex min-h-[3.75rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-1.5 py-2 transition-all ${
                          isSelected
                            ? 'border-finance/60 bg-finance/8 shadow-sm'
                            : 'border-border/60 bg-card hover:border-border hover:bg-muted/40'
                        }`}
                      >
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                          isSelected
                            ? type === 'income' ? 'bg-income' : 'bg-expense'
                            : 'bg-muted/70'
                        }`}>
                          <Icon
                            size={14}
                            strokeWidth={isSelected ? 2.5 : 2}
                            className={isSelected ? 'text-white' : 'text-muted-foreground'}
                          />
                        </div>
                        <span className={`w-full truncate text-center text-[9.5px] font-bold leading-tight transition-colors ${
                          isSelected ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {category}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {form.formState.errors.category && (
                  <FormError className="ml-1 mt-2.5" size="xs">
                    {form.formState.errors.category.message as string}
                  </FormError>
                )}
              </div>

              <div className="mb-2">
                <label className="text-pill-label mb-2.5 block">
                  Catatan <span className="font-medium normal-case tracking-normal opacity-60">(opsional)</span>
                </label>
                <input
                  {...form.register('note')}
                  type="text"
                  placeholder="Misal: Beli kopi susu…"
                  className="w-full rounded-xl border border-border bg-background px-4 py-3.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-finance focus:ring-2 focus:ring-finance/20"
                />
              </div>
            </div>

            <div className="shrink-0 border-t border-border/50 bg-card px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3.5 sm:px-6">
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="min-h-[3.25rem] w-full rounded-[1rem] bg-finance py-3.5 text-[15px] font-bold text-finance-text transition-all hover:bg-finance/90 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {form.formState.isSubmitting ? 'Menyimpan…' : 'Simpan Transaksi'}
              </Button>
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}