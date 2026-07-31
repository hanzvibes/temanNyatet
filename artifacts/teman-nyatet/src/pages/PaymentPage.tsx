import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { NotebookPen, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { openPaymentCheckout, type PaymentPlan } from '@/lib/payment';

export default function PaymentPage() {
  const [checkoutPlan, setCheckoutPlan] = useState<PaymentPlan | null>(null);

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
    <div className="min-h-dvh flex flex-col items-center justify-center p-5 sm:p-6 bg-background">
      <div className="w-full max-w-sm flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-elevation-1 text-primary-foreground">
          <NotebookPen size={24} />
        </div>
        <h1 className="text-display">TemanNyatet</h1>
      </div>

      <div className="w-full max-w-sm bg-card rounded-[1.5rem] shadow-elevation-2 p-6 border border-card-border">
        <h2 className="text-2xl font-bold text-foreground mb-2">Satu langkah lagi!</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Aktivasi akun kamu untuk mulai mencatat sat-set tanpa batas.
        </p>

        <div className="flex flex-col gap-4">
          <div className="border border-border rounded-2xl p-4 flex flex-col bg-surface/40">
            <h3 className="font-semibold text-lg">Bulanan</h3>
            <p className="text-2xl font-bold mt-1 mb-4">Rp 100.000<span className="text-sm font-normal text-muted-foreground"> / bulan</span></p>
            <button
              type="button"
              onClick={() => void handleCheckout('monthly')}
              disabled={checkoutPlan !== null}
              className="w-full min-h-11 py-2.5 rounded-xl border-2 border-primary text-primary font-semibold text-center hover:bg-primary/5 transition-colors disabled:opacity-50"
            >
              {checkoutPlan === 'monthly' ? 'Menyiapkan pembayaran…' : 'Pilih Bulanan'}
            </button>
          </div>

          <div className="border-2 border-primary rounded-2xl p-4 flex flex-col relative overflow-hidden shadow-elevation-1">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              REKOMENDASI
            </div>
            <h3 className="font-semibold text-lg text-primary">Tahunan</h3>
            <p className="text-2xl font-bold mt-1 mb-4">Rp 249.000<span className="text-sm font-normal text-muted-foreground"> / tahun</span></p>
            <button
              type="button"
              onClick={() => void handleCheckout('yearly')}
              disabled={checkoutPlan !== null}
              className="w-full min-h-11 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-center hover:opacity-90 shadow-elevation-1 transition-opacity disabled:opacity-50"
            >
              {checkoutPlan === 'yearly' ? 'Menyiapkan pembayaran…' : 'Pilih Tahunan'}
            </button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Setelah pembayaran, akun aktif otomatis.
        </p>
      </div>

      <button
        onClick={handleLogout}
        className="mt-4 min-h-11 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        <LogOut size={16} /> Keluar
      </button>
    </div>
  );
}
