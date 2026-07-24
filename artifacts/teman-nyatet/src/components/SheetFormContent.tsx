/**
 * SheetFormContent — compact inline add forms for each section,
 * shown inside BottomSheetNav when the user pulls the sheet up.
 * Each form is its own component so only the active hook is called.
 */
import React, { useState } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotes }        from '@/hooks/useNotes';
import { useTransactions } from '@/hooks/useTransactions';
import { useTodos }        from '@/hooks/useTodos';
import { useLinks }        from '@/hooks/useLinks';
import { useForm }         from 'react-hook-form';
import { zodResolver }     from '@hookform/resolvers/zod';
import * as z              from 'zod';
import { format }          from 'date-fns';
import { ExternalLink }    from 'lucide-react';
import {
  TransactionType,
  DEFAULT_INCOME_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_PAYMENT_SOURCES,
} from '@/lib/database.types';
import { toast } from 'sonner';

// ─── Shared input style helpers ───────────────────────────────────────────────
const inp  = 'w-full bg-white border border-border rounded-xl py-2.5 px-3.5 outline-none text-sm font-bold text-foreground transition-all';
const inpFocus = (color: string) => `${inp} focus:border-[${color}] focus:ring-2 focus:ring-[${color}]/20`;

// ─── Note Form ────────────────────────────────────────────────────────────────
const TAGS = ['Kerja', 'Personal', 'Ide', 'Belajar', 'Lainnya'];
const noteSchema = z.object({
  title:   z.string().optional(),
  content: z.string().min(1, 'Konten tidak boleh kosong'),
  tags:    z.array(z.string()).default([]),
});
type NoteForm = z.infer<typeof noteSchema>;

function NoteSheetForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuthContext();
  const { createNote } = useNotes(user?.id);
  const form = useForm<NoteForm>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', content: '', tags: [] },
  });

  const onSubmit = async (data: NoteForm) => {
    try {
      await createNote({ title: data.title, content: data.content, tags: data.tags });
      form.reset();
      onSuccess();
    } catch {
      toast.error('Gagal menyimpan catatan.');
    }
  };

  const tags = form.watch('tags');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 h-full">
      <input
        {...form.register('title')}
        placeholder="Judul (opsional)"
        className="w-full text-lg font-extrabold bg-transparent outline-none placeholder:text-muted-foreground/50 border-b border-border pb-2"
      />
      <textarea
        {...form.register('content')}
        placeholder="Apa yang ingin kamu catat?"
        className="flex-1 min-h-[80px] resize-none bg-white border border-border rounded-xl p-3 outline-none text-sm font-medium placeholder:text-muted-foreground/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all leading-relaxed"
      />
      {form.formState.errors.content && (
        <p className="text-destructive text-xs font-bold">{form.formState.errors.content.message}</p>
      )}
      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {TAGS.map(tag => {
          const sel = tags.includes(tag);
          return (
            <button key={tag} type="button"
              onClick={() => form.setValue('tags', sel ? tags.filter(t => t !== tag) : [...tags, tag])}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                sel ? 'bg-primary text-primary-foreground border-primary' : 'bg-white text-muted-foreground border-border'
              }`}
            >{tag}</button>
          );
        })}
      </div>
      <button type="submit"
        className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-[1rem] text-sm transition-colors hover:brightness-95 active:scale-[0.98]"
      >
        Simpan Catatan
      </button>
    </form>
  );
}

// ─── Keuangan Form ────────────────────────────────────────────────────────────
const txSchema = z.object({
  type:   z.enum(['income', 'expense']),
  amount: z.string().min(1),
  category: z.string().min(1, 'Pilih kategori'),
  source: z.string(),
  note:   z.string().optional(),
  date:   z.string(),
});
type TxForm = z.infer<typeof txSchema>;

function KeuanganSheetForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuthContext();
  const { createTransaction } = useTransactions(user?.id);
  const [txType, setTxType] = useState<TransactionType>('expense');

  const form = useForm<TxForm>({
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

  const onSubmit = async (data: TxForm) => {
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
      form.reset({ type: 'expense', amount: '', category: '', source: 'Cash', note: '', date: format(new Date(), 'yyyy-MM-dd') });
      setTxType('expense');
      onSuccess();
    } catch {
      toast.error('Gagal menyimpan transaksi.');
    }
  };

  const switchType = (t: TransactionType) => {
    setTxType(t);
    form.setValue('type', t);
    form.setValue('category', '');
  };

  const cats = txType === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES;
  const cat  = form.watch('category');

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-3 h-full">
      {/* Toggle */}
      <div className="flex bg-secondary p-1 rounded-2xl gap-1">
        {(['income', 'expense'] as TransactionType[]).map(t => (
          <button key={t} type="button"
            onClick={() => switchType(t)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              txType === t ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
            }`}
          >
            {t === 'income' ? 'Pemasukan' : 'Pengeluaran'}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-lg font-extrabold text-muted-foreground/50">Rp</span>
        <input
          {...form.register('amount')}
          type="text"
          inputMode="numeric"
          placeholder="0"
          className="w-full text-2xl font-extrabold bg-white border border-border rounded-xl py-3 pl-12 pr-4 outline-none focus:border-[#F4C753] focus:ring-2 focus:ring-[#F4C753]/20 transition-all"
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '');
            form.setValue('amount', val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '', { shouldValidate: true });
          }}
        />
        {form.formState.errors.amount && (
          <p className="text-destructive text-xs font-bold mt-1">{form.formState.errors.amount.message}</p>
        )}
      </div>

      {/* Date + Source */}
      <div className="flex gap-2">
        <input {...form.register('date')} type="date"
          className={`flex-1 ${inpFocus('#F4C753')}`} />
        <select {...form.register('source')}
          className={`flex-1 ${inpFocus('#F4C753')} appearance-none`}>
          {DEFAULT_PAYMENT_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Category chips (horizontal scroll) */}
      <div>
        <p className="text-pill-tag mb-1.5">Kategori</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {cats.map(c => (
            <button key={c} type="button"
              onClick={() => form.setValue('category', c, { shouldValidate: true })}
              className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                cat === c
                  ? 'bg-[#F4C753]/20 border-[#F4C753] text-[#8B6914]'
                  : 'bg-white border-border text-muted-foreground'
              }`}
            >{c}</button>
          ))}
        </div>
        {form.formState.errors.category && (
          <p className="text-destructive text-xs font-bold mt-1">{form.formState.errors.category.message}</p>
        )}
      </div>

      {/* Note */}
      <input {...form.register('note')} type="text"
        placeholder="Catatan tambahan (opsional)"
        className={inpFocus('#F4C753')} />

      <button type="submit"
        className="w-full bg-[#F4C753] text-[#4A3D18] font-bold py-3 rounded-[1rem] text-sm transition-colors hover:brightness-95 active:scale-[0.98] mt-auto"
      >
        Simpan Transaksi 💾
      </button>
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
        className="w-full text-lg font-extrabold bg-transparent border-b-2 border-border pb-2.5 outline-none focus:border-[#9CB4D4] transition-colors placeholder:text-muted-foreground/50"
      />
      {form.formState.errors.title && (
        <p className="text-destructive text-xs font-bold -mt-1">{form.formState.errors.title.message}</p>
      )}
      <textarea
        {...form.register('description')}
        placeholder="Catatan tambahan (opsional)"
        className="min-h-[60px] resize-none bg-white border border-border rounded-xl p-3 outline-none text-sm font-medium placeholder:text-muted-foreground/50 focus:border-[#9CB4D4] focus:ring-2 focus:ring-[#9CB4D4]/20 transition-all"
      />
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-pill-tag mb-1 block">Tanggal</label>
          <input {...form.register('due_date')} type="date"
            className={inpFocus('#9CB4D4')} />
        </div>
        <div className="flex-1">
          <label className="text-pill-tag mb-1 block">Waktu</label>
          <input {...form.register('due_time')} type="time"
            className={inpFocus('#9CB4D4')} />
        </div>
      </div>
      <button type="submit"
        className="w-full bg-[#9CB4D4] text-white font-bold py-3 rounded-[1rem] text-sm transition-colors hover:brightness-95 active:scale-[0.98] mt-auto"
      >
        Simpan To-Do ✓
      </button>
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
          className={`${inpFocus('#E09898')} pl-10`}
        />
        {form.formState.errors.url && (
          <p className="text-destructive text-xs font-bold mt-1">{form.formState.errors.url.message}</p>
        )}
      </div>
      <input
        {...form.register('title')}
        placeholder="Judul link"
        className={inpFocus('#E09898')}
      />
      {form.formState.errors.title && (
        <p className="text-destructive text-xs font-bold -mt-1">{form.formState.errors.title.message}</p>
      )}
      <textarea
        {...form.register('note')}
        placeholder="Catatan (opsional)"
        className="min-h-[60px] resize-none bg-white border border-border rounded-xl p-3 outline-none text-sm font-medium placeholder:text-muted-foreground/50 focus:border-[#E09898] focus:ring-2 focus:ring-[#E09898]/20 transition-all"
      />
      <button type="submit"
        className="w-full bg-[#E09898] text-white font-bold py-3 rounded-[1rem] text-sm transition-colors hover:brightness-95 active:scale-[0.98] mt-auto"
      >
        Simpan Link 🔗
      </button>
    </form>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
const SECTION_META: Record<string, { label: string; color: string }> = {
  '/catatan':   { label: 'Catatan Baru',      color: '#3D6B4F' },
  '/keuangan':  { label: 'Tambah Transaksi',  color: '#8B6914' },
  '/todo':      { label: 'To-Do Baru',        color: '#3D6B96' },
  '/linksaver': { label: 'Simpan Link',        color: '#963D3D' },
};

interface Props {
  path: string;
  onSuccess: () => void;
}

export default function SheetFormContent({ path, onSuccess }: Props) {
  const section = Object.keys(SECTION_META).find(k => path.startsWith(k)) ?? '/catatan';
  const meta = SECTION_META[section];

  return (
    <div className="flex flex-col h-full">
      <p className="text-[11px] font-bold uppercase tracking-widest mb-3 px-0.5" style={{ color: meta.color }}>
        {meta.label}
      </p>
      <div className="flex-1 flex flex-col min-h-0">
        {section === '/catatan'   && <NoteSheetForm     onSuccess={onSuccess} />}
        {section === '/keuangan'  && <KeuanganSheetForm onSuccess={onSuccess} />}
        {section === '/todo'      && <TodoSheetForm     onSuccess={onSuccess} />}
        {section === '/linksaver' && <LinkSheetForm     onSuccess={onSuccess} />}
      </div>
    </div>
  );
}
