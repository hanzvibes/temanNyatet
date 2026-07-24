import React, { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AnimatePresence } from 'framer-motion';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import SettingsSheet from '@/components/SettingsSheet';
import { useCreate } from '@/contexts/CreateContext';
import { useTransactions } from '@/hooks/useTransactions';
import { format, isToday, isYesterday } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, Wallet, ArrowDown, ArrowUp, Briefcase, Coffee, ShoppingBag, Car, HeartPulse, Laptop, Gamepad2, Gift, Receipt, Home, MoreHorizontal, BookOpen } from 'lucide-react';
import { PageEmpty, PageLoading } from '@/components/PageStates';
import { Drawer } from 'vaul';
import { TransactionType, DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_PAYMENT_SOURCES } from '@/lib/database.types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import SearchBar from '@/components/SearchBar';

// Using proper lucide icons instead of emojis
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'Gaji': return <Briefcase size={20} className="text-white" />;
    case 'Freelance': return <Laptop size={20} className="text-white" />;
    case 'Bisnis': return <Home size={20} className="text-white" />;
    case 'Investasi': return <ArrowUp size={20} className="text-white" />;
    case 'Hadiah': return <Gift size={20} className="text-white" />;
    case 'Makanan': return <Coffee size={20} className="text-white" />;
    case 'Transport': return <Car size={20} className="text-white" />;
    case 'Belanja': return <ShoppingBag size={20} className="text-white" />;
    case 'Tagihan': return <Receipt size={20} className="text-white" />;
    case 'Kesehatan': return <HeartPulse size={20} className="text-white" />;
    case 'Hiburan': return <Gamepad2 size={20} className="text-white" />;
    case 'Pendidikan': return <BookOpen size={20} className="text-white" />;
    default: return <MoreHorizontal size={20} className="text-white" />;
  }
};

const getCategoryColor = (category: string, type: TransactionType) => {
  if (type === 'income') return 'bg-[#4ADE80]'; // Green
  // Mix of pinks, yellows, blues for expenses to make it playful
  const colors = ['bg-[#F87171]', 'bg-[#FBBF24]', 'bg-[#60A5FA]', 'bg-[#A78BFA]', 'bg-[#F472B6]', 'bg-[#34D399]'];
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = category.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
};

const txSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.string().min(1, 'Nominal harus diisi'),
  category: z.string().min(1, 'Pilih kategori'),
  source: z.string().min(1, 'Pilih sumber dana'),
  note: z.string().optional(),
  date: z.string().min(1, 'Pilih tanggal'),
});

type TxFormValues = z.infer<typeof txSchema>;

export default function KeuanganPage() {
  const { user } = useAuthContext();
  const { transactions, loading, monthlySummary, createTransaction, deleteTransaction } = useTransactions(user?.id);
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

  const filteredTransactions = transactions.filter(tx => {
    if (!search) return true;
    const l = search.toLowerCase();
    return tx.category.toLowerCase().includes(l) || (tx.note && tx.note.toLowerCase().includes(l));
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
    } catch (e) {
      // Handled in hook
    }
  };

  const groupedTx = filteredTransactions.reduce((acc, tx) => {
    const d = tx.date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(tx);
    return acc;
  }, {} as Record<string, typeof transactions>);

  const sortedDates = Object.keys(groupedTx).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const getFormatDate = (dateStr: string) => {
    // Append local noon time so `new Date()` parses the string as local time
    // instead of UTC midnight, which would shift the date by one day for
    // timezones behind UTC (e.g. UTC-8 reads "2026-07-13" as July 12).
    const date = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
    if (isToday(date)) return 'Hari Ini';
    if (isYesterday(date)) return 'Kemarin';
    return format(date, 'd MMMM yyyy', { locale: id });
  };

  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const handlePressStart = (id: string) => {
    pressTimer.current = setTimeout(async () => {
      setDeletingId(id);
      try {
        await deleteTransaction(id);
      } finally {
        setDeletingId(null);
      }
    }, 800);
  };
  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-dvh pb-32 lg:pb-16">
      {/* Header Area */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b-0">
        <div className="px-6 py-6 pb-4 space-y-5 lg:px-10 max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-pill-label mb-1 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-page-title">Keuangan</h1>
            </div>
            <SettingsSheet avatarBg="bg-[#FFF8D6]" avatarTextColor="text-[#F4C753]" />
          </div>
        </div>
      </div>

      {/* Desktop: two-column (balance card left, list right). Mobile: stacked. */}
      <div className="px-6 lg:px-10 max-w-screen-xl mx-auto w-full
                      space-y-6 lg:space-y-0
                      lg:grid lg:grid-cols-[360px_1fr] lg:gap-10 lg:items-start lg:pt-6 lg:pb-8">

        {/* ── Left column: balance card (sticky on desktop) ── */}
        <div className="space-y-6 lg:sticky lg:top-6 pt-4 lg:pt-0">
          {/* Balance Card */}
          <div className="bg-card rounded-[1.5rem] p-6 shadow-sm border border-border">
            <div className="flex flex-col items-center mb-6">
               <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Total Saldo</p>
               <h2 className="text-4xl font-extrabold text-foreground tracking-tight">{formatRupiah(monthlySummary.balance)}</h2>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 bg-[#4ADE80]/10 rounded-2xl p-4 flex flex-col items-center border border-[#4ADE80]/20">
                <div className="flex items-center gap-1.5 text-[#4ADE80] mb-2">
                  <ArrowUp size={16} strokeWidth={3} />
                  <span className="text-xs font-bold uppercase tracking-wider">Pemasukan</span>
                </div>
                <span className="font-extrabold text-[#4ADE80]">{formatRupiah(monthlySummary.income)}</span>
              </div>
              <div className="flex-1 bg-[#F87171]/10 rounded-2xl p-4 flex flex-col items-center border border-[#F87171]/20">
                <div className="flex items-center gap-1.5 text-[#F87171] mb-2">
                  <ArrowDown size={16} strokeWidth={3} />
                  <span className="text-xs font-bold uppercase tracking-wider">Pengeluaran</span>
                </div>
                <span className="font-extrabold text-[#F87171]">{formatRupiah(monthlySummary.expense)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column: search + transaction list ── */}
        <div className="space-y-6 pt-0 lg:pt-0 pb-8 lg:pb-0">
          <SearchBar value={search} onChange={setSearch} placeholder="Cari transaksi..." />

          {/* List */}
          <div>
            {loading ? (
              <PageLoading accent="keuangan" label="Memuat transaksi…" />
            ) : sortedDates.length === 0 ? (
              <PageEmpty
                accent="keuangan"
                icon={Wallet}
                title={search ? 'Tidak ada hasil pencarian' : 'Belum ada transaksi bulan ini'}
                description={search ? 'Coba kata kunci lain atau hapus filter.' : 'Tarik handle di bawah untuk menambah transaksi pertama.'}
              />
            ) : (
              <div className="space-y-6">
                {sortedDates.map(dateStr => (
                  <div key={dateStr}>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-3">
                      {getFormatDate(dateStr)}
                    </h3>
                    <div className="space-y-3">
                      <AnimatePresence>
                        {groupedTx[dateStr].map(tx => (
                          <AnimatedListItem
                            key={tx.id}
                            className="relative bg-white rounded-[1.25rem] p-4 flex items-center justify-between shadow-sm border border-border/50 hover:bg-secondary/50 transition-colors active:scale-[0.98] select-none overflow-hidden"
                            onMouseDown={() => handlePressStart(tx.id)}
                            onMouseUp={handlePressEnd}
                            onMouseLeave={handlePressEnd}
                            onTouchStart={() => handlePressStart(tx.id)}
                            onTouchEnd={handlePressEnd}
                            onTouchMove={handlePressEnd}
                          >
                            {deletingId === tx.id && (
                              <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-[1px] flex items-center justify-center gap-2 text-red-500 font-bold text-sm">
                                <Loader2 size={16} className="animate-spin" /> Menghapus...
                              </div>
                            )}
                            <div className="flex items-center gap-4">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${getCategoryColor(tx.category, tx.type)}`}>
                                {getCategoryIcon(tx.category)}
                              </div>
                              <div>
                                <p className="font-extrabold text-foreground text-base mb-0.5">{tx.category}</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-secondary text-muted-foreground rounded-md border border-border">
                                    {tx.source}
                                  </span>
                                  {tx.note && <span className="text-xs font-medium text-muted-foreground line-clamp-1">{tx.note}</span>}
                                </div>
                              </div>
                            </div>
                            <div className={`font-extrabold text-lg ${tx.type === 'income' ? 'text-[#4ADE80]' : 'text-foreground'}`}>
                              {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)}
                            </div>
                          </AnimatedListItem>
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


      {/* Form Sheet */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-[90vh] z-50 outline-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-6 mt-4" />
            
            <form onSubmit={form.handleSubmit(onSubmitForm)} className="flex flex-col px-6 pb-8 overflow-y-auto">
              {/* Type Toggle */}
              <div className="flex bg-secondary p-1.5 rounded-[1.25rem] mb-6">
                <button
                  type="button"
                  onClick={() => { setTxType('expense'); form.setValue('type', 'expense'); form.setValue('category', ''); }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                    txType === 'expense' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => { setTxType('income'); form.setValue('type', 'income'); form.setValue('category', ''); }}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                    txType === 'income' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pemasukan
                </button>
              </div>

              {/* Amount */}
              <div className="mb-6">
                <label className="text-pill-label mb-2 block">Nominal</label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-muted-foreground/50">Rp</span>
                  <input
                    {...form.register('amount')}
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    className="w-full text-4xl font-extrabold bg-white border border-border rounded-[1.5rem] py-5 pl-16 pr-5 outline-none focus:border-[#F4C753] focus:ring-2 focus:ring-[#F4C753]/20 transition-all text-foreground"
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const formatted = val ? new Intl.NumberFormat('id-ID').format(Number(val)) : '';
                      form.setValue('amount', formatted, { shouldValidate: true });
                    }}
                  />
                </div>
                {form.formState.errors.amount && (
                  <p className="text-destructive font-medium text-sm mt-2 ml-2">{form.formState.errors.amount.message as string}</p>
                )}
              </div>

              {/* Date & Source */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="text-pill-label mb-2 block">Tanggal</label>
                  <input
                    {...form.register('date')}
                    type="date"
                    className="w-full bg-white border border-border rounded-xl py-3 px-4 outline-none focus:border-[#F4C753] focus:ring-2 focus:ring-[#F4C753]/20 text-sm font-bold text-foreground"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-pill-label mb-2 block">Sumber</label>
                  <select
                    {...form.register('source')}
                    className="w-full bg-white border border-border rounded-xl py-3 px-4 outline-none focus:border-[#F4C753] focus:ring-2 focus:ring-[#F4C753]/20 text-sm font-bold text-foreground appearance-none"
                  >
                    {DEFAULT_PAYMENT_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Category Grid */}
              <div className="mb-6">
                <label className="text-pill-label mb-3 block">Kategori</label>
                <div className="grid grid-cols-4 gap-3">
                  {(txType === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : DEFAULT_INCOME_CATEGORIES).map(cat => {
                    const isSelected = form.watch('category') === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => form.setValue('category', cat, { shouldValidate: true })}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all border ${
                          isSelected ? 'bg-[#F4C753]/10 border-[#F4C753] shadow-sm' : 'bg-white border-border hover:bg-secondary'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isSelected ? getCategoryColor(cat, txType) : 'bg-secondary text-muted-foreground'}`}>
                           {isSelected ? getCategoryIcon(cat) : <div className="text-muted-foreground opacity-50">{getCategoryIcon(cat)}</div>}
                        </div>
                        <span className={`text-[10px] font-bold text-center uppercase tracking-wider ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{cat}</span>
                      </button>
                    );
                  })}
                </div>
                {form.formState.errors.category && (
                  <p className="text-destructive font-medium text-sm mt-3 ml-2">{form.formState.errors.category.message as string}</p>
                )}
              </div>

              {/* Note */}
              <div className="mb-8">
                <label className="text-pill-label mb-2 block">Catatan Tambahan</label>
                <input
                  {...form.register('note')}
                  type="text"
                  placeholder="Misal: Beli kopi susu..."
                  className="w-full bg-white border border-border rounded-xl py-4 px-5 outline-none focus:border-[#F4C753] focus:ring-2 focus:ring-[#F4C753]/20 text-sm font-medium"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-[#F4C753] text-[#4A3D18] font-bold text-lg py-4 rounded-[1.25rem] shadow-sm hover:bg-[#E0B442] transition-colors"
              >
                Simpan Transaksi
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
