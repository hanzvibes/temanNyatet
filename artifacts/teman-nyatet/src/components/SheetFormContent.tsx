/**
 * SheetFormContent — compact inline add forms for each section,
 * shown inside BottomSheetNav when the user pulls the sheet up.
 * Each form is its own component so only the active hook is called.
 */
import React, { useEffect, useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotes }        from '@/hooks/useNotes';
import { useTransactions } from '@/hooks/useTransactions';
import { useTodos }        from '@/hooks/useTodos';
import { useLinks }        from '@/hooks/useLinks';
import { useForm }         from 'react-hook-form';
import { useHaptic, HAPTIC } from '@/hooks/useHaptic';
import { zodResolver }     from '@hookform/resolvers/zod';
import * as z              from 'zod';
import { format }          from 'date-fns';
import { ExternalLink }    from 'lucide-react';
import {
  NOTE_TAGS,
  CATEGORY_ICON,
  FALLBACK_CATEGORY_ICON,
} from '@/lib/categoryIcons';
import { FormError } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type TransactionType,
} from '@/lib/database.types';
import { toast } from 'sonner';
import { getNoteColor, NOTE_COLORS } from '@/lib/noteColors';
import {
  DEFAULT_PAYMENT_SOURCES,
  getTransactionCategories,
  parseTransactionAmount,
  transactionFormSchema,
  createTransactionFormDefaults,
  type TransactionFormValues,
} from '@/lib/transactions';
import {
  parseTransactionVoiceTranscript,
  type ParsedTransactionVoice,
} from '@/lib/transaction-voice-parser';

// ─── Shared input style helpers ───────────────────────────────────────────────
// [color-scheme:light] + dark:[color-scheme:dark] keeps browser-native controls
// (date, time, select) readable in both light and dark mode.
// text-base (16px) is the minimum font size that prevents iOS Safari from
// auto-zooming inputs on focus, keeping the native-app feel.
const inp  = 'w-full bg-card border border-border rounded-xl py-2.5 px-3.5 outline-none text-base font-bold text-foreground transition-all [color-scheme:light] dark:[color-scheme:dark]';
const inpFocus = (color: string) => `${inp} focus:border-${color} focus:ring-2 focus:ring-${color}/20`;

// ─── Note Form ────────────────────────────────────────────────────────────────
const TAGS = NOTE_TAGS.map(({ name }) => name); // legacy order, dropdown-compatible
const noteSchema = z.object({
  title:   z.string().optional(),
  content: z.string().min(1, 'Konten tidak boleh kosong'),
  tags:    z.array(z.string()).default([]),
  color:   z.string().optional(),
});
type NoteForm = z.infer<typeof noteSchema>;

function NoteSheetForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuthContext();
  const { createNote } = useNotes(user?.id);
  const haptic = useHaptic();
  const form = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', content: '', tags: [], color: '' },
  });

  const onSubmit = async (data: NoteForm) => {
    try {
      await createNote({
        title: data.title,
        content: data.content,
        tags: data.tags,
        color: data.color || null,
      });
      form.reset();
      onSuccess();
    } catch {
      toast.error('Gagal menyimpan catatan.');
    }
  };

  const tags = form.watch('tags');
  const selectedColor = form.watch('color');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 h-full">
      <input
        {...form.register('title')}
        placeholder="Judul (opsional)"
        className="w-full text-lg font-bold bg-transparent outline-none placeholder:text-muted-foreground/50 border-b border-border pb-2"
      />
      <textarea
        {...form.register('content')}
        placeholder="Apa yang ingin kamu catat?"
        className="flex-1 min-h-[80px] resize-none bg-card border border-border rounded-xl p-3 outline-none text-base font-medium placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
      />
      {form.formState.errors.content && (
        <FormError size="xs">{form.formState.errors.content.message}</FormError>
      )}
      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {NOTE_TAGS.map(({ name: tag, icon: Icon }) => {
          const sel = tags.includes(tag);
          return (
            <button key={tag} type="button"
              onClick={() => form.setValue('tags', sel ? tags.filter(t => t !== tag) : [...tags, tag])}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary text-muted-foreground border-border'
              }`}
            ><Icon size={14} strokeWidth={2.4} className="flex-shrink-0" />{tag}</button>
          );
        })}
      </div>
      <div className="space-y-2">
        <p className="text-pill-tag px-0.5">Warna kartu</p>
        <div className="flex flex-wrap items-center gap-3">
          {NOTE_COLORS.map(({ value, label }) => {
            const isSelected = selectedColor === value;
            return (
              <button
                key={value}
                type="button"
                aria-label={`Warna ${label}${isSelected ? ', dipilih' : ''}`}
                aria-pressed={isSelected}
                onClick={() => form.setValue('color', value)}
                className={`h-11 w-11 min-h-[44px] min-w-[44px] rounded-full border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  isSelected
                    ? 'scale-105 shadow-md ring-2 ring-foreground/60 ring-offset-2'
                    : 'hover:scale-[1.03]'
                }`}
                style={{
                  backgroundColor: value,
                  borderColor: `color-mix(in srgb, ${getNoteColor(value).border} 80%, transparent)`,
                }}
              />
            );
          })}
        </div>
      </div>
      <Button type="submit" className="w-full mt-auto" onClick={() => haptic(HAPTIC.tap)}>
        Simpan Catatan
      </Button>
    </form>
  );
}

// ─── Keuangan Form ────────────────────────────────────────────────────────────
function KeuanganSheetForm({
  onSuccess,
  initialTransactionType = 'expense',
  initialVoiceTranscript,
  initialVoiceTransaction,
  onVoiceTranscriptApplied,
}: {
  onSuccess: () => void;
  initialTransactionType?: TransactionType;
  initialVoiceTranscript?: string;
  initialVoiceTransaction?: ParsedTransactionVoice;
  onVoiceTranscriptApplied?: () => void;
}) {
  const { user } = useAuthContext();
  const { createTransaction } = useTransactions(user?.id);
  const haptic = useHaptic();
  const [txType, setTxType] = useState<TransactionType>(initialTransactionType);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: createTransactionFormDefaults(initialTransactionType),
  });

  const onSubmit = async (data: TransactionFormValues) => {
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
       form.reset(createTransactionFormDefaults());
      setTxType('expense');
      onSuccess();
    } catch {
      // useTransactions handles the error and opens the Free-plan dialog when
      // the server rejects a create because the quota has been reached.
    }
  };

  const switchType = (t: TransactionType) => {
    setTxType(t);
    form.setValue('type', t);
    form.setValue('category', '');
  };

  useEffect(() => {
    if (!initialVoiceTranscript && !initialVoiceTransaction) return;
    const parsed = initialVoiceTransaction
      ?? parseTransactionVoiceTranscript(initialVoiceTranscript ?? '');
    if (parsed.type) {
      form.setValue('type', parsed.type, { shouldDirty: true, shouldValidate: true });
      setTxType(parsed.type);
    }
    if (parsed.amount !== undefined) {
      form.setValue('amount', parsed.amount, { shouldDirty: true, shouldValidate: true });
    }
    if (parsed.category !== undefined) {
      form.setValue('category', parsed.category, { shouldDirty: true, shouldValidate: true });
    }
    if (parsed.source !== undefined) {
      form.setValue('source', parsed.source, { shouldDirty: true, shouldValidate: true });
    }
    if (parsed.date !== undefined) {
      form.setValue('date', parsed.date, { shouldDirty: true, shouldValidate: true });
    }
    if (parsed.note !== undefined) {
      const current = form.getValues('note')?.trim() ?? '';
      form.setValue('note', current ? `${current}\n${parsed.note}` : parsed.note, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    onVoiceTranscriptApplied?.();
  }, [initialVoiceTranscript, initialVoiceTransaction]);

  const cats = getTransactionCategories(txType);
  const cat  = form.watch('category');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 h-full">
      {/* Toggle */}
      <div className="flex bg-secondary p-1 rounded-2xl gap-1">
        {(['income', 'expense'] as TransactionType[]).map(t => (
          <button key={t} type="button"
            onClick={() => switchType(t)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              txType === t ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t === 'income' ? 'Pemasukan' : 'Pengeluaran'}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground/50">Rp</span>
        <input
          {...form.register('amount')}
          type="text"
          inputMode="numeric"
          placeholder="0"
          className="w-full text-2xl font-bold bg-card border border-border rounded-xl py-3 pl-12 pr-4 outline-none focus:border-finance focus:ring-2 focus:ring-finance/20 transition-all text-foreground"
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            form.setValue('amount', val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '', { shouldValidate: true });
          }}
        />
        {form.formState.errors.amount && (
          <FormError size="xs" className="mt-1">{form.formState.errors.amount.message}</FormError>
        )}
      </div>

      {/* Date + Source */}
      <div className="grid grid-cols-1 min-[380px]:grid-cols-2 gap-2">
        <label className="min-w-0 space-y-1.5">
          <span className="text-pill-tag block px-0.5">Tanggal</span>
          <input
            {...form.register('date')}
            type="date"
            className={`min-w-0 ${inpFocus('finance')}`}
          />
        </label>
        <label className="min-w-0 space-y-1.5">
          <span className="text-pill-tag block px-0.5">Sumber dana</span>
          <Select
            value={form.watch('source')}
            onValueChange={(value) =>
              form.setValue('source', value, { shouldDirty: true })
            }
          >
            <SelectTrigger
              aria-label="Sumber dana"
              className="min-h-[42px] h-auto w-full min-w-0 rounded-xl border-border bg-card px-3.5 py-2.5 text-base font-bold text-foreground shadow-none transition-[border-color,box-shadow] focus:border-finance focus:ring-2 focus:ring-finance/20 [&>span]:min-w-0 [&>span]:truncate"
            >
              <SelectValue placeholder="Pilih sumber" />
            </SelectTrigger>
            <SelectContent
              position="popper"
              className="z-[70] max-h-56 rounded-xl border-border/80 bg-card p-1 shadow-elevation-2"
            >
              {DEFAULT_PAYMENT_SOURCES.map((source) => (
                <SelectItem
                  key={source}
                  value={source}
                  className="min-h-11 rounded-lg px-3 py-2.5 text-sm font-medium focus:bg-finance/12 focus:text-foreground"
                >
                  {source}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      </div>

      {/* Category chips (horizontal scroll) */}
      <div>
        <p className="text-pill-tag mb-1.5">Kategori</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {cats.map(c => {
            const Icon = CATEGORY_ICON[c] ?? FALLBACK_CATEGORY_ICON;
            return (
              <button key={c} type="button"
                onClick={() => form.setValue('category', c, { shouldValidate: true })}
                className={`inline-flex items-center gap-1.5 flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                  cat === c
                    ? 'bg-finance/20 border-finance text-finance-text'
                    : 'bg-card border-border text-muted-foreground'
                }`}
              ><Icon size={14} strokeWidth={2.4} className="flex-shrink-0" />{c}</button>
            );
          })}
        </div>
        {form.formState.errors.category && (
          <FormError size="xs" className="mt-1">{form.formState.errors.category.message}</FormError>
        )}
      </div>

      {/* Note */}
      <textarea
        {...form.register('note')}
        rows={2}
        placeholder="Catatan tambahan (opsional)"
        className={`${inpFocus('finance')} min-h-[4.5rem] resize-none leading-relaxed`}
      />

      <Button type="submit" className="w-full bg-finance text-finance-text border-transparent hover:bg-finance/90 mt-auto" onClick={() => haptic(HAPTIC.tap)}>
        Simpan Transaksi 💾
      </Button>
    </form>
  );
}

// ─── Todo Form ────────────────────────────────────────────────────────────────
const todoSchema = z.object({
  title:       z.string().min(1, 'Judul wajib diisi'),
  description: z.string().optional(),
  due_date:    z.string().optional(),
  due_time:    z.string().optional(),
});
type TodoFormVals = z.infer<typeof todoSchema>;

function TodoSheetForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuthContext();
  const { createTodo } = useTodos(user?.id);
  const haptic = useHaptic();
  const form = useForm<TodoFormVals>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: '', description: '', due_date: '', due_time: '' },
  });

  const onSubmit = async (data: TodoFormVals) => {
    try {
      await createTodo({
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        due_time: data.due_time || null,
        is_done: false,
      });
      form.reset();
      onSuccess();
    } catch {
      toast.error('Gagal menyimpan to-do.');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 h-full">
      <input
        {...form.register('title')}
        placeholder="Apa yang harus dikerjakan?"
        className="w-full text-lg font-bold bg-transparent border-b-2 border-border pb-2.5 outline-none focus:border-todo transition-colors placeholder:text-muted-foreground/50"
      />
      {form.formState.errors.title && (
        <FormError size="xs" className="-mt-1">{form.formState.errors.title.message}</FormError>
      )}
      <textarea
        {...form.register('description')}
        placeholder="Catatan tambahan (opsional)"
        className="min-h-[60px] resize-none bg-card border border-border rounded-xl p-3 outline-none text-base font-medium placeholder:text-muted-foreground/50 focus:border-todo focus:ring-2 focus:ring-todo/20 transition-all"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-pill-tag mb-1 block">Tanggal</label>
          <input {...form.register('due_date')} type="date"
            className={inpFocus('todo')} />
        </div>
        <div className="flex-1">
          <label className="text-pill-tag mb-1 block">Waktu</label>
          <input {...form.register('due_time')} type="time"
            className={inpFocus('todo')} />
        </div>
      </div>
      <Button type="submit" className="w-full bg-todo text-white border-transparent hover:bg-todo/90 mt-auto" onClick={() => haptic(HAPTIC.tap)}>
        Simpan To-Do ✓
      </Button>
    </form>
  );
}

// ─── Link Form ────────────────────────────────────────────────────────────────
const linkSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  url:   z.string().url('URL tidak valid'),
  note:  z.string().optional(),
});
type LinkFormVals = z.infer<typeof linkSchema>;

function LinkSheetForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuthContext();
  const { createLink } = useLinks(user?.id);
  const haptic = useHaptic();
  const form = useForm<LinkFormVals>({
    resolver: zodResolver(linkSchema),
    defaultValues: { title: '', url: '', note: '' },
  });

  const onSubmit = async (data: LinkFormVals) => {
    try {
      let url = data.url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) url = 'https://' + url;
      await createLink({ title: data.title, url, note: data.note || null });
      form.reset();
      onSuccess();
    } catch {
      toast.error('Gagal menyimpan link.');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 h-full">
      <div className="relative">
        <ExternalLink className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={16} strokeWidth={2.5} />
        <input
          {...form.register('url')}
          type="url"
          placeholder="https://..."
          className={`${inpFocus('linksaver')} pl-10`}
        />
        {form.formState.errors.url && (
          <FormError size="xs" className="mt-1">{form.formState.errors.url.message}</FormError>
        )}
      </div>
      <input
        {...form.register('title')}
        placeholder="Judul link"
        className={inpFocus('linksaver')}
      />
      {form.formState.errors.title && (
        <FormError size="xs" className="-mt-1">{form.formState.errors.title.message}</FormError>
      )}
      <textarea
        {...form.register('note')}
        placeholder="Catatan (opsional)"
        className="min-h-[60px] resize-none bg-card border border-border rounded-xl p-3 outline-none text-base font-medium placeholder:text-muted-foreground/50 focus:border-linksaver focus:ring-2 focus:ring-linksaver/20 transition-all"
      />
      <Button type="submit" className="w-full bg-linksaver text-white border-transparent hover:bg-linksaver/90 mt-auto" onClick={() => haptic(HAPTIC.tap)}>
        Simpan Link 🔗
      </Button>
    </form>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
const SECTION_META: Record<string, { label: string; color: string }> = {
  '/catatan':   { label: 'Catatan Baru',      color: 'var(--color-primary)' },
  '/keuangan':  { label: 'Tambah Transaksi',  color: 'var(--color-finance-text)' },
  '/todo':      { label: 'To-Do Baru',        color: 'var(--color-todo-text)' },
  '/linksaver': { label: 'Simpan Link',        color: 'var(--color-linksaver-text)' },
};

interface Props {
  path: string;
  initialTransactionType?: TransactionType;
  initialVoiceTranscript?: string;
  initialVoiceTransaction?: ParsedTransactionVoice;
  onVoiceTranscriptApplied?: () => void;
  onSuccess: () => void;
}

export default function SheetFormContent({
  path,
  initialTransactionType,
  initialVoiceTranscript,
  initialVoiceTransaction,
  onVoiceTranscriptApplied,
  onSuccess,
}: Props) {
  const section = Object.keys(SECTION_META).find(k => path.startsWith(k)) ?? '/catatan';
  const meta = SECTION_META[section];

  return (
    <div className="flex flex-col h-full">
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-0.5" style={{ color: meta.color }}>
        {meta.label}
      </p>
      <div className="flex-1 flex flex-col min-h-0">
        {section === '/catatan'   && <NoteSheetForm     onSuccess={onSuccess} />}
        {section === '/keuangan'  && (
          <KeuanganSheetForm
            initialTransactionType={initialTransactionType}
            initialVoiceTranscript={initialVoiceTranscript}
            initialVoiceTransaction={initialVoiceTransaction}
            onVoiceTranscriptApplied={onVoiceTranscriptApplied}
            onSuccess={onSuccess}
          />
        )}
        {section === '/todo'      && <TodoSheetForm     onSuccess={onSuccess} />}
        {section === '/linksaver' && <LinkSheetForm     onSuccess={onSuccess} />}
      </div>
    </div>
  );
}
