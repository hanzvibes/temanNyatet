import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import {
  LogOut,
  Check,
  BookOpen,
  DollarSign,
  ListTodo,
  Link2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { openPaymentCheckout, type PaymentPlan } from '@/lib/payment';

const FEATURES = [
  { icon: BookOpen,    label: 'Catatan tanpa batas'       },
  { icon: DollarSign, label: 'Lacak keuangan harian'      },
  { icon: ListTodo,   label: 'To-do list pintar'          },
  { icon: Link2,      label: 'Simpan link penting'        },
];

const STEPS = ['Daftar', 'Aktifkan', 'Mulai'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((label, i) => {
        const done    = i < current;
        const active  = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`
                  flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors
                  ${done   ? 'bg-primary text-primary-foreground'          : ''}
                  ${active ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' : ''}
                  ${!done && !active ? 'border-2 border-border bg-card text-muted-foreground' : ''}
                `}
              >
                {done ? <Check size={13} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mb-4 mx-2 h-0.5 w-10 rounded-full transition-colors ${
                  i < current ? 'bg-primary' : 'bg-border'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function PaymentPage() {
  const [checkoutPlan, setCheckoutPlan] = useState<PaymentPlan | null>(null);
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCheckout = async (plan: PaymentPlan) => {
    setCheckoutPlan(plan);
    try {
      await openPaymentCheckout(plan);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyiapkan pembayaran. Coba lagi.');
    } finally {
      setCheckoutPlan(null);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-5 py-10">
      {/* Brand */}
      <div className="mb-7 flex flex-col items-center gap-3">
        <div className="relative flex h-[4rem] w-[4rem] rotate-[-3deg] items-center justify-center rounded-[1.25rem] bg-primary shadow-elevated">
          <div className="absolute flex h-10 w-9 -rotate-6 items-center justify-center rounded-md border border-finance-text/50 bg-finance shadow-sm">
            <BookOpen size={18} className="text-white" />
          </div>
        </div>
        <h1 className="text-display">TemanNyatet</h1>
      </div>

      {/* Progress */}
      <div className="mb-7">
        <StepIndicator current={1} />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-card-border bg-card shadow-elevated"
      >
        {/* Header */}
        <div className="border-b border-border px-6 py-6">
          <div className="mb-1 flex items-center gap-2">
            <Zap size={16} className="text-finance-text" />
            <span className="text-xs font-bold uppercase tracking-widest text-finance-text">
              Satu langkah lagi
            </span>
          </div>
          <h2 className="text-[1.5rem] font-semibold leading-tight tracking-tight text-foreground">
            Aktifkan akun kamu
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Akses semua fitur tanpa batas setelah aktivasi.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-2 px-6 py-5">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-xl bg-secondary/60 px-3 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon size={14} className="text-primary" />
              </div>
              <span className="text-xs font-medium leading-tight text-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Pricing */}
        <div className="space-y-3 px-6 pb-6">
          {/* Yearly — recommended */}
          <button
            type="button"
            onClick={() => void handleCheckout('yearly')}
            disabled={checkoutPlan !== null}
            className="group relative w-full overflow-hidden rounded-2xl border-2 border-primary bg-primary px-5 py-4 text-left shadow-elevation-1 transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-60"
          >
            <span className="absolute right-0 top-0 rounded-bl-xl bg-finance px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-finance-text">
              Hemat 79%
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">
              Tahunan
            </p>
            <div className="mt-1 flex items-end gap-1.5">
              <span className="text-2xl font-bold text-primary-foreground">Rp 249.000</span>
              <span className="mb-0.5 text-sm text-primary-foreground/60">/ tahun</span>
            </div>
            <p className="mt-0.5 text-xs text-primary-foreground/60">
              setara Rp 20.750 / bulan
            </p>
            <div className="mt-3.5 flex h-9 w-full items-center justify-center rounded-xl bg-primary-foreground/15 text-sm font-semibold text-primary-foreground transition-colors group-hover:bg-primary-foreground/20">
              {checkoutPlan === 'yearly' ? 'Menyiapkan…' : 'Pilih Tahunan →'}
            </div>
          </button>

          {/* Monthly */}
          <button
            type="button"
            onClick={() => void handleCheckout('monthly')}
            disabled={checkoutPlan !== null}
            className="group w-full rounded-2xl border border-border bg-card px-5 py-4 text-left transition-all hover:border-primary/30 hover:bg-secondary/40 active:scale-[0.99] disabled:opacity-60"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Bulanan
            </p>
            <div className="mt-1 flex items-end gap-1.5">
              <span className="text-xl font-bold text-foreground">Rp 100.000</span>
              <span className="mb-0.5 text-sm text-muted-foreground">/ bulan</span>
            </div>
            <div className="mt-3 flex h-9 w-full items-center justify-center rounded-xl border border-border text-sm font-semibold text-foreground transition-colors group-hover:border-primary/30 group-hover:text-primary">
              {checkoutPlan === 'monthly' ? 'Menyiapkan…' : 'Pilih Bulanan'}
            </div>
          </button>

          <p className="pt-1 text-center text-xs text-muted-foreground">
            Akun aktif otomatis setelah pembayaran berhasil.
          </p>
        </div>
      </motion.div>

      <button
        type="button"
        onClick={() => setLocation('/catatan')}
        className="mt-4 min-h-10 px-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        Lewati untuk sekarang
      </button>

      <button
        onClick={handleLogout}
        className="mt-2 flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <LogOut size={15} /> Keluar
      </button>
    </div>
  );
}
