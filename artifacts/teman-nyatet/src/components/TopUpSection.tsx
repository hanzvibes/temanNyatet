/**
 * TopUpSection — AI Credit top-up UI rendered inside SettingsSheet's
 * subscription panel. Fetches credit history from Supabase directly (RLS
 * policies allow users to read their own ledger), shows packages, history,
 * FAQ, and a security badge. Payment integration is wired through the
 * `onRequestTopUp` callback — pass a real handler once a payment gateway
 * route is ready.
 */
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  Sparkles,
  Zap,
  HelpCircle,
  ChevronDown,
  ShieldCheck,
  Clock,
  TrendingUp,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// ── Package catalogue ─────────────────────────────────────────────────────────

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // IDR
  badge: string | null;
  badgeVariant: 'primary' | 'finance' | 'muted';
  perCredit: number; // IDR per credit, for value comparison
  highlight: boolean;
}

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'credit_100',
    name: 'Starter',
    credits: 100,
    price: 10_000,
    badge: null,
    badgeVariant: 'muted',
    perCredit: 100,
    highlight: false,
  },
  {
    id: 'credit_300',
    name: 'Popular',
    credits: 300,
    price: 25_000,
    badge: 'Terlaris',
    badgeVariant: 'primary',
    perCredit: 83,
    highlight: true,
  },
  {
    id: 'credit_700',
    name: 'Value',
    credits: 700,
    price: 50_000,
    badge: 'Best Value',
    badgeVariant: 'primary',
    perCredit: 71,
    highlight: false,
  },
  {
    id: 'credit_1500',
    name: 'Power',
    credits: 1_500,
    price: 100_000,
    badge: 'Hemat 33%',
    badgeVariant: 'finance',
    perCredit: 67,
    highlight: false,
  },
];

// ── Credit ledger types ───────────────────────────────────────────────────────

interface LedgerEntry {
  id: string;
  amount: number;
  balance_after: number;
  reason: string;
  reference_id: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatIDR(n: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function reasonLabel(reason: string): string {
  if (reason === 'ai_summary') return 'Ringkas AI';
  if (reason === 'initial' || reason === 'signup') return 'Kredit Awal';
  if (reason.startsWith('topup') || reason.startsWith('payment')) return 'Top Up';
  if (reason === 'grant' || reason === 'bonus') return 'Bonus';
  return reason;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BadgeChip({ pkg }: { pkg: CreditPackage }) {
  if (!pkg.badge) return null;
  const cls =
    pkg.badgeVariant === 'primary'
      ? 'bg-primary/15 text-primary border-primary/25'
      : pkg.badgeVariant === 'finance'
        ? 'bg-[hsl(var(--finance))] text-[hsl(var(--finance-text))] border-transparent bg-opacity-20'
        : 'bg-muted text-muted-foreground border-border';
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider leading-none ${cls}`}
    >
      {pkg.badge}
    </span>
  );
}

interface PackageCardProps {
  pkg: CreditPackage;
  buying: boolean;
  onBuy: (pkg: CreditPackage) => void;
}

function PackageCard({ pkg, buying, onBuy }: PackageCardProps) {
  const border = pkg.highlight
    ? 'border-primary/50 shadow-[0_0_0_1px_hsl(var(--primary)/0.25)]'
    : 'border-border';
  const bg = pkg.highlight ? 'bg-primary/[0.04]' : 'bg-card';

  return (
    <motion.div
      layout
      className={`relative rounded-2xl border ${border} ${bg} p-4 flex flex-col gap-3 transition-colors`}
    >
      {/* Badge */}
      {pkg.badge && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <BadgeChip pkg={pkg} />
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mt-0.5">
        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {pkg.name}
        </span>
        <span className="text-[10px] font-medium text-muted-foreground">
          ~{formatIDR(pkg.perCredit)}/cr
        </span>
      </div>

      {/* Credits */}
      <div className="flex items-baseline gap-1">
        <span className={`text-3xl font-black tabular-nums leading-none ${pkg.highlight ? 'text-primary' : 'text-foreground'}`}>
          {pkg.credits.toLocaleString('id-ID')}
        </span>
        <span className="text-xs font-bold text-muted-foreground mb-0.5">credit</span>
      </div>

      {/* Price + CTA */}
      <div className="mt-auto flex flex-col gap-2">
        <p className="text-base font-bold text-foreground">{formatIDR(pkg.price)}</p>
        <button
          type="button"
          onClick={() => onBuy(pkg)}
          disabled={buying}
          aria-label={`Beli ${pkg.credits} credit seharga ${formatIDR(pkg.price)}`}
          className={`w-full min-h-10 rounded-xl text-sm font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50 active:scale-[0.98] ${
            pkg.highlight
              ? 'bg-primary text-primary-foreground border border-[var(--primary-border)] shadow-elevation-1 hover:opacity-90'
              : 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/75'
          }`}
        >
          {buying ? <Loader2 size={14} className="inline animate-spin mr-1" /> : null}
          Beli
        </button>
      </div>
    </motion.div>
  );
}

// ── FAQ accordion ─────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    q: 'Apa itu AI Credit?',
    a: 'Credit digunakan untuk fitur Ringkas AI — 1 credit untuk 1 ringkasan catatan. Semakin banyak credit, semakin banyak ringkasan yang bisa kamu buat.',
  },
  {
    q: 'Credit berlaku berapa lama?',
    a: 'Credit tidak kedaluwarsa selama akunmu aktif. Gunakan kapan saja tanpa tekanan waktu.',
  },
  {
    q: 'Apa yang terjadi jika pembayaran gagal?',
    a: 'Credit hanya ditambahkan setelah pembayaran dikonfirmasi. Jika gagal, saldo tidak berubah dan kamu bisa mencoba lagi.',
  },
  {
    q: 'Apakah credit bisa direfund?',
    a: 'Credit yang sudah dibeli dan dikreditkan ke akun tidak dapat dikembalikan. Pastikan paket yang dipilih sesuai kebutuhanmu.',
  },
];

function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="space-y-1.5">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIdx === idx;
        return (
          <div key={idx} className="rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIdx(isOpen ? null : idx)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-foreground hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
            >
              <span>{item.q}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.22 }}
                className="flex-shrink-0 text-muted-foreground"
              >
                <ChevronDown size={15} strokeWidth={2.5} />
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
                  className="overflow-hidden"
                >
                  <p className="px-4 pb-3 text-[13px] leading-relaxed text-muted-foreground">
                    {item.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── History row ───────────────────────────────────────────────────────────────

function HistoryRow({ entry }: { entry: LedgerEntry }) {
  const isTopUp = entry.amount > 0;
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/60 last:border-0">
      <div
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs ${
          isTopUp
            ? 'bg-primary/15 text-primary'
            : 'bg-muted text-muted-foreground'
        }`}
      >
        {isTopUp ? <TrendingUp size={13} strokeWidth={2.5} /> : <Sparkles size={13} strokeWidth={2.5} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground leading-tight truncate">
          {reasonLabel(entry.reason)}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(entry.created_at)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p
          className={`text-sm font-black tabular-nums leading-tight ${
            isTopUp ? 'text-primary' : 'text-muted-foreground'
          }`}
        >
          {isTopUp ? '+' : ''}{entry.amount}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{entry.balance_after} sisa</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export interface TopUpSectionProps {
  /** Current credit balance from the subscription status API. */
  creditBalance: number;
  /**
   * Called when the user picks a package. Provide a real implementation
   * once a payment gateway route is wired. For now shows a "Segera hadir" toast.
   */
  onRequestTopUp?: (pkg: CreditPackage) => Promise<void>;
}

export default function TopUpSection({ creditBalance, onRequestTopUp }: TopUpSectionProps) {
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState(false);
  const [buying, setBuying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = async () => {
    setHistoryLoading(true);
    setHistoryError(false);
    try {
      const { data, error } = await supabase
        .from('credit_ledger')
        .select('id, amount, balance_after, reason, reference_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setHistory(data ?? []);
    } catch {
      setHistoryError(true);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const handleBuy = async (pkg: CreditPackage) => {
    if (onRequestTopUp) {
      setBuying(true);
      try {
        await onRequestTopUp(pkg);
      } finally {
        setBuying(false);
      }
      return;
    }
    // Default placeholder: payment gateway not yet wired
    toast.info('Segera hadir!', {
      description: `Paket ${pkg.name} (${pkg.credits} credit) akan tersedia dalam waktu dekat.`,
      duration: 4000,
    });
  };

  // Credit bar display — cap at 20 for visual, but show the real number
  const barMax = Math.max(creditBalance, 20);
  const barFill = Math.min(creditBalance, 20);
  const isEmpty = creditBalance === 0;
  const isLow = creditBalance > 0 && creditBalance <= 3;

  const balanceTone = isEmpty
    ? { ring: 'border-border', bg: 'bg-secondary', num: 'text-foreground', bar: 'bg-primary/30', track: 'bg-muted' }
    : isLow
      ? { ring: 'border-orange-400/40', bg: 'bg-orange-50/60 dark:bg-orange-900/20', num: 'text-orange-600 dark:text-orange-300', bar: 'bg-orange-400', track: 'bg-orange-200/40 dark:bg-orange-900/40' }
      : { ring: 'border-primary/25', bg: 'bg-primary/[0.06]', num: 'text-primary', bar: 'bg-primary', track: 'bg-primary/10' };

  return (
    <div className="space-y-5 pt-1">

      {/* ── Balance hero ── */}
      <div className={`rounded-2xl border ${balanceTone.ring} ${balanceTone.bg} px-5 py-4`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isEmpty ? 'bg-muted' : isLow ? 'bg-orange-200/60 dark:bg-orange-900/40' : 'bg-primary/15'}`}>
              <Sparkles size={18} strokeWidth={2.3} className={balanceTone.num} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Saldo Credit</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEmpty ? 'Credit habis — top up untuk melanjutkan' : isLow ? 'Tinggal sedikit — pertimbangkan top up' : '1 credit = 1 ringkasan AI'}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-4xl font-black leading-none tabular-nums ${balanceTone.num}`}>
              {creditBalance}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">tersisa</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className={`mt-4 h-1.5 w-full overflow-hidden rounded-full ${balanceTone.track}`}>
          <motion.div
            className={`h-full rounded-full ${balanceTone.bar}`}
            initial={{ width: 0 }}
            animate={{ width: barMax === 0 ? '0%' : `${(barFill / barMax) * 100}%` }}
            transition={{ duration: 0.6, ease: [0.32, 0.72, 0, 1], delay: 0.1 }}
          />
        </div>
      </div>

      {/* ── Packages ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Zap size={14} strokeWidth={2.5} className="text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pilih Paket Top Up
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {CREDIT_PACKAGES.map(pkg => (
            <PackageCard key={pkg.id} pkg={pkg} buying={buying} onBuy={handleBuy} />
          ))}
        </div>
      </div>

      {/* ── Credit history ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowHistory(v => !v)}
          className="flex w-full items-center justify-between gap-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <Clock size={14} strokeWidth={2.5} className="text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Riwayat Transaksi
            </span>
          </div>
          <div className="flex items-center gap-2">
            {historyError && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); void loadHistory(); }}
                className="text-primary focus-visible:outline-none"
                aria-label="Muat ulang riwayat"
              >
                <RefreshCw size={13} strokeWidth={2.5} />
              </button>
            )}
            <motion.span
              animate={{ rotate: showHistory ? 180 : 0 }}
              transition={{ duration: 0.22 }}
              className="text-muted-foreground"
            >
              <ChevronDown size={15} strokeWidth={2.5} />
            </motion.span>
          </div>
        </button>

        <AnimatePresence initial={false}>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-2 rounded-xl border border-border bg-card px-4 overflow-hidden">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                    <Loader2 size={15} className="animate-spin" />
                    <span className="text-xs font-medium">Memuat riwayat…</span>
                  </div>
                ) : historyError ? (
                  <div className="py-5 text-center">
                    <p className="text-xs text-muted-foreground">Gagal memuat riwayat.</p>
                    <button
                      type="button"
                      onClick={() => void loadHistory()}
                      className="mt-2 text-xs font-bold text-primary hover:underline focus-visible:outline-none"
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-6 text-center">
                    <Sparkles size={22} className="mx-auto mb-2 text-muted-foreground/40" strokeWidth={1.5} />
                    <p className="text-xs text-muted-foreground">Belum ada transaksi credit.</p>
                  </div>
                ) : (
                  <div>
                    {history.map(entry => (
                      <HistoryRow key={entry.id} entry={entry} />
                    ))}
                    {history.length === 20 && (
                      <p className="py-2 text-center text-[11px] text-muted-foreground">
                        Menampilkan 20 transaksi terakhir
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── FAQ ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle size={14} strokeWidth={2.5} className="text-muted-foreground" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pertanyaan Umum
          </h3>
        </div>
        <FaqAccordion />
      </div>

      {/* ── Security badge ── */}
      <div className="flex items-center justify-center gap-2 py-2 text-muted-foreground/60">
        <ShieldCheck size={13} strokeWidth={2} />
        <span className="text-[11px] font-medium">Pembayaran aman & terenkripsi</span>
        <ShieldCheck size={13} strokeWidth={2} />
      </div>

    </div>
  );
}
