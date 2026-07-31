import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  CircleHelp,
  CreditCard,
  ExternalLink,
  FileText,
  History,
  Loader2,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { openPaymentCheckout, type PaymentPlan } from '@/lib/payment';
import {
  formatIDR,
  formatSubscriptionDate,
  formatSubscriptionDateTime,
  getSubscriptionOverview,
  planLabel,
  statusLabel,
  type SubscriptionHistoryItem,
  type SubscriptionOverview,
} from '@/lib/subscription';

const FAQ_ITEMS = [
  {
    question: 'Kapan langganan saya aktif?',
    answer: 'Langganan aktif setelah pembayaran berhasil dikonfirmasi oleh SumoPod. Kamu tidak perlu mengaktifkannya secara manual.',
  },
  {
    question: 'Apa yang terjadi saat langganan berakhir?',
    answer: 'Data tetap tersimpan. Kamu bisa memperpanjang kapan saja untuk kembali menggunakan seluruh fitur PRO.',
  },
  {
    question: 'Bagaimana cara memperpanjang langganan?',
    answer: 'Pilih tombol Perpanjang atau Kelola Paket di halaman ini, lalu selesaikan pembayaran melalui SumoPod.',
  },
  {
    question: 'Apakah receipt selalu tersedia?',
    answer: 'Receipt ditampilkan jika provider mengirimkan tautannya. Detail order dan payment ID tetap tersedia sebagai referensi transaksi.',
  },
];

function statusTone(status: SubscriptionOverview['profile']['status']) {
  if (status === 'active') {
    return {
      badge: 'border-income/20 bg-income/10 text-income',
      icon: 'bg-income/15 text-income',
      surface: 'border-income/20 bg-income/[0.045]',
    };
  }
  if (status === 'archived') {
    return {
      badge: 'border-destructive/20 bg-destructive/10 text-destructive',
      icon: 'bg-destructive/10 text-destructive',
      surface: 'border-destructive/15 bg-destructive/[0.035]',
    };
  }
  return {
    badge: 'border-finance/30 bg-finance/15 text-finance-text',
    icon: 'bg-finance/20 text-finance-text',
    surface: 'border-finance/25 bg-finance/[0.06]',
  };
}

function orderTone(status: SubscriptionHistoryItem['status']) {
  if (status === 'completed') return 'border-income/20 bg-income/10 text-income';
  if (status === 'failed' || status === 'expired') return 'border-destructive/20 bg-destructive/10 text-destructive';
  return 'border-finance/30 bg-finance/15 text-finance-text';
}

function PageHeader({ onBack }: { onBack: () => void }) {
  return (
    <header className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Kembali"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-elevation-1 transition-transform hover:text-foreground active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft size={18} strokeWidth={2.3} />
      </button>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Akun & pembayaran</p>
        <h1 className="truncate text-2xl font-black tracking-tight text-foreground">Kelola Langganan</h1>
      </div>
    </header>
  );
}

function StatusHero({ overview, onUpgrade }: { overview: SubscriptionOverview; onUpgrade: () => void }) {
  const tone = statusTone(overview.profile.status);
  const isActive = overview.profile.status === 'active';
  const progress = isActive && overview.profile.days_remaining !== null
    ? Math.min(100, Math.max(5, (overview.profile.days_remaining / (overview.profile.plan === 'yearly' ? 365 : 31)) * 100))
    : 0;

  return (
    <section className={`overflow-hidden rounded-[1.75rem] border p-5 shadow-elevation-1 sm:p-6 ${tone.surface}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
            {isActive ? <BadgeCheck size={25} strokeWidth={2.1} /> : <WalletCards size={24} strokeWidth={2.1} />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Status akun</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black tracking-tight text-foreground">{planLabel(overview.profile.plan)}</h2>
              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone.badge}`}>
                {statusLabel(overview.profile.status)}
              </span>
            </div>
          </div>
        </div>
        <ShieldCheck className="shrink-0 text-primary/70" size={20} aria-label="Pembayaran aman" />
      </div>

      {isActive ? (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <InfoCell icon={<CalendarDays size={15} />} label="Mulai" value={formatSubscriptionDate(overview.profile.started_at)} />
            <InfoCell icon={<CalendarDays size={15} />} label="Berakhir" value={formatSubscriptionDate(overview.profile.ends_at)} />
            <InfoCell icon={<CreditCard size={15} />} label="Pembayaran" value={overview.profile.payment_method ?? 'Belum tersedia'} />
            <InfoCell icon={<History size={15} />} label="Sisa waktu" value={overview.profile.days_remaining === null ? '—' : `${overview.profile.days_remaining} hari`} />
          </div>
          <div className="mt-5">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
              <span>Masa langganan</span>
              <span>{overview.profile.days_remaining ?? 0} hari tersisa</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
              <motion.div
                className="h-full rounded-full bg-income"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="mt-5 flex flex-col items-start gap-4 rounded-2xl border border-border/70 bg-card/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-foreground">
              {overview.profile.status === 'archived' ? 'Langganan kamu sudah berakhir.' : 'Belum ada langganan aktif.'}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Pilih paket untuk membuka pengalaman mencatat yang lebih lengkap.
            </p>
          </div>
          <Button onClick={onUpgrade} className="w-full shrink-0 gap-2 sm:w-auto">
            <Sparkles size={16} /> Pilih Paket
          </Button>
        </div>
      )}
    </section>
  );
}

function InfoCell({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/60 bg-card/60 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-[10px] font-bold uppercase tracking-wider">{label}</span></div>
      <p className="mt-1.5 truncate text-xs font-bold text-foreground">{value}</p>
    </div>
  );
}

function FeaturesCard({ features }: { features: string[] }) {
  return (
    <section className="rounded-[1.5rem] border border-border bg-card p-5 shadow-elevation-1 sm:p-6">
      <SectionHeading icon={<BadgeCheck size={16} />} eyebrow="Yang kamu dapat" title="Fitur PRO" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {features.map((feature) => (
          <div key={feature} className="flex items-center gap-3 rounded-2xl bg-secondary/60 px-3.5 py-3 text-sm font-semibold text-foreground">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-income/15 text-income"><Check size={14} strokeWidth={3} /></span>
            {feature}
          </div>
        ))}
      </div>
    </section>
  );
}

function CreditsCard({ credits, onBuy }: { credits: SubscriptionOverview['credits']; onBuy: () => void }) {
  return (
    <section className="rounded-[1.5rem] border border-primary/15 bg-primary/[0.045] p-5 shadow-elevation-1 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <SectionHeading icon={<Sparkles size={16} />} eyebrow="AI Credit" title="Saldo & penggunaan" />
        <span className="rounded-xl bg-primary/10 px-3 py-2 text-right">
          <strong className="block text-xl font-black tabular-nums text-primary">{credits.balance}</strong>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">tersisa</span>
        </span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <InfoCell icon={<ArrowUpRight size={15} />} label="Dibeli" value={`${credits.purchased} credit`} />
        <InfoCell icon={<Sparkles size={15} />} label="Digunakan" value={`${credits.used} credit`} />
      </div>
      <Button variant="outline" onClick={onBuy} className="mt-4 w-full gap-2 border-primary/25 text-primary hover:bg-primary/10">
        <Sparkles size={16} /> Beli Credit AI
      </Button>
    </section>
  );
}

function SectionHeading({ icon, eyebrow, title }: { icon: React.ReactNode; eyebrow: string; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-primary">{icon}</span>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-0.5 text-lg font-black tracking-tight text-foreground">{title}</h2>
      </div>
    </div>
  );
}

function QuickActions({ overview, onUpgrade, onCredits }: { overview: SubscriptionOverview; onUpgrade: () => void; onCredits: () => void }) {
  const active = overview.profile.status === 'active';
  return (
    <section>
      <SectionHeading icon={<ArrowUpRight size={16} />} eyebrow="Aksi cepat" title="Kelola kebutuhanmu" />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <ActionButton icon={<RefreshCw size={17} />} label={active ? 'Perpanjang' : 'Upgrade'} onClick={onUpgrade} />
        <ActionButton icon={<WalletCards size={17} />} label="Kelola Paket" onClick={onUpgrade} />
        <ActionButton icon={<Sparkles size={17} />} label="Beli Credit AI" onClick={onCredits} />
        <ActionButton icon={<History size={17} />} label="Lihat Penggunaan" onClick={() => document.getElementById('credit-usage')?.scrollIntoView({ behavior: 'smooth' })} />
      </div>
    </section>
  );
}

function ActionButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="group flex min-h-[4.25rem] items-center gap-3 rounded-2xl border border-border bg-card px-3.5 text-left shadow-elevation-1 transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-elevation-2 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary transition-colors group-hover:bg-primary/10">{icon}</span>
      <span className="text-sm font-bold text-foreground">{label}</span>
    </button>
  );
}

function SubscriptionHistory({ history, onDetails }: { history: SubscriptionHistoryItem[]; onDetails: (item: SubscriptionHistoryItem) => void }) {
  return (
    <section>
      <div className="flex items-end justify-between gap-3">
        <SectionHeading icon={<History size={16} />} eyebrow="Transaksi" title="Subscription History" />
        {history.length > 0 && <span className="text-xs font-semibold text-muted-foreground">{history.length} transaksi</span>}
      </div>
      {history.length === 0 ? (
        <div className="mt-3 rounded-[1.5rem] border border-dashed border-border bg-card px-5 py-10 text-center shadow-elevation-1">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground"><ReceiptText size={25} /></div>
          <h3 className="mt-4 text-lg font-black text-foreground">Belum ada riwayat pembelian</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-muted-foreground">Riwayat transaksi langganan kamu akan muncul di sini setelah pembelian berhasil.</p>
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-elevation-1">
          {history.map((item) => (
            <div key={item.order_id} className="flex flex-col gap-3 border-b border-border/70 p-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary"><FileText size={18} /></div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-foreground">{planLabel(item.plan)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{formatSubscriptionDateTime(item.created_at)} · {item.order_id.slice(-8)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-sm font-black tabular-nums text-foreground">{formatIDR(item.amount)}</p>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${orderTone(item.status)}`}>{statusLabel(item.status)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onDetails(item)} className="gap-1.5 text-primary">
                  Detail <ArrowUpRight size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TransactionDialog({ item, onClose }: { item: SubscriptionHistoryItem | null; onClose: () => void }) {
  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 backdrop-blur-sm sm:items-center sm:p-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
          <motion.div role="dialog" aria-modal="true" aria-labelledby="transaction-title" className="w-full max-w-md rounded-t-[1.75rem] border border-border bg-card p-5 shadow-2xl sm:rounded-[1.75rem] sm:p-6" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}>
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Detail transaksi</p><h2 id="transaction-title" className="mt-1 text-xl font-black text-foreground">{planLabel(item.plan)}</h2></div>
              <button type="button" onClick={onClose} aria-label="Tutup detail transaksi" className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X size={17} /></button>
            </div>
            <div className="mt-5 divide-y divide-border/70 rounded-2xl border border-border/70 bg-secondary/35 px-4">
              <DetailRow label="Status" value={statusLabel(item.status)} />
              <DetailRow label="Nominal" value={formatIDR(item.amount)} />
              <DetailRow label="Order ID" value={item.order_id} mono />
              <DetailRow label="Payment ID" value={item.payment_id ?? 'Belum tersedia'} mono />
              <DetailRow label="Dibuat" value={formatSubscriptionDateTime(item.created_at)} />
              <DetailRow label="Selesai" value={formatSubscriptionDateTime(item.completed_at)} />
            </div>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              {item.receipt_url ? <Button asChild className="flex-1 gap-2"><a href={item.receipt_url} target="_blank" rel="noreferrer"><ReceiptText size={16} /> Lihat Receipt <ExternalLink size={14} /></a></Button> : <div className="flex flex-1 items-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold text-muted-foreground"><ReceiptText size={16} /> Receipt belum tersedia</div>}
              {item.payment_link_url && item.status === 'pending' && <Button variant="outline" asChild className="flex-1 gap-2"><a href={item.payment_link_url} target="_blank" rel="noreferrer"><CreditCard size={16} /> Lanjutkan pembayaran</a></Button>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div className="flex items-start justify-between gap-4 py-3 text-sm"><span className="text-muted-foreground">{label}</span><span className={`max-w-[65%] break-all text-right font-bold text-foreground ${mono ? 'font-mono text-xs' : ''}`}>{value}</span></div>;
}

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section>
      <SectionHeading icon={<CircleHelp size={16} />} eyebrow="Bantuan" title="Pertanyaan umum" />
      <div className="mt-3 space-y-2">
        {FAQ_ITEMS.map((item, index) => {
          const expanded = open === index;
          return (
            <div key={item.question} className="overflow-hidden rounded-2xl border border-border bg-card shadow-elevation-1">
              <button type="button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : index)} className="flex min-h-14 w-full items-center justify-between gap-4 px-4 text-left text-sm font-bold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset">
                {item.question}<motion.span animate={{ rotate: expanded ? 180 : 0 }}><ChevronDown size={16} className="text-muted-foreground" /></motion.span>
              </button>
              <AnimatePresence initial={false}>{expanded && <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{item.answer}</motion.p>}</AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PageSkeleton() {
  return <div className="space-y-5" aria-label="Memuat informasi langganan"><div className="h-64 animate-pulse rounded-[1.75rem] bg-secondary" /><div className="grid gap-5 lg:grid-cols-2"><div className="h-48 animate-pulse rounded-[1.5rem] bg-secondary" /><div className="h-48 animate-pulse rounded-[1.5rem] bg-secondary" /></div><div className="h-56 animate-pulse rounded-[1.5rem] bg-secondary" /></div>;
}

export default function SubscriptionPage() {
  const [, setLocation] = useLocation();
  const [overview, setOverview] = useState<SubscriptionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<SubscriptionHistoryItem | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<PaymentPlan | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setError(false);
    try {
      setOverview(await getSubscriptionOverview());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
    const handleVisible = () => {
      if (document.visibilityState === 'visible') void loadOverview();
    };
    document.addEventListener('visibilitychange', handleVisible);
    return () => document.removeEventListener('visibilitychange', handleVisible);
  }, []);

  const openCheckout = async () => {
    const plan = overview?.profile.plan ?? 'yearly';
    setCheckoutPlan(plan);
    try {
      await openPaymentCheckout(plan);
    } catch (checkoutError) {
      toast.error(checkoutError instanceof Error ? checkoutError.message : 'Gagal menyiapkan pembayaran.');
    } finally {
      setCheckoutPlan(null);
    }
  };

  const creditUsage = useMemo(() => overview?.credits.used ?? 0, [overview]);

  return (
    <main className="min-h-dvh bg-background px-4 pb-12 pt-5 sm:px-6 sm:pt-8 lg:px-10">
      <div className="mx-auto max-w-5xl">
        <PageHeader onBack={() => setLocation('/catatan')} />
        <div className="mt-6">
          {loading && !overview ? <PageSkeleton /> : error && !overview ? (
            <div className="rounded-[1.5rem] border border-destructive/20 bg-destructive/[0.04] px-5 py-10 text-center">
              <p className="font-bold text-foreground">Informasi langganan belum dapat dimuat.</p>
              <p className="mt-1 text-sm text-muted-foreground">Periksa koneksi internet lalu coba lagi.</p>
              <Button variant="outline" onClick={() => void loadOverview()} className="mt-5 gap-2"><RefreshCw size={16} /> Coba lagi</Button>
            </div>
          ) : overview ? (
            <div className="space-y-6">
              <StatusHero overview={overview} onUpgrade={() => void openCheckout()} />
              <QuickActions
                overview={overview}
                onUpgrade={() => void openCheckout()}
                onCredits={() => document.getElementById('credit-usage')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              />
              <div className="grid items-start gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <FeaturesCard features={overview.features} />
                <div id="credit-usage"><CreditsCard credits={overview.credits} onBuy={() => {
                  toast.info('Buka menu Top Up AI Credit dari Pengaturan untuk memilih paket.');
                  window.dispatchEvent(new CustomEvent('teman-nyatet:open-settings-topup'));
                }} /></div>
              </div>
              <SubscriptionHistory history={overview.history} onDetails={setSelectedTransaction} />
              <FaqSection />
              <div className="flex items-center justify-center gap-2 pt-1 text-xs font-semibold text-muted-foreground"><ShieldCheck size={15} className="text-primary" /> Pembayaran diproses secara aman</div>
            </div>
          ) : null}
        </div>
      </div>
      <TransactionDialog item={selectedTransaction} onClose={() => setSelectedTransaction(null)} />
      {checkoutPlan && <div className="sr-only" aria-live="polite">Menyiapkan pembayaran paket {checkoutPlan}</div>}
    </main>
  );
}