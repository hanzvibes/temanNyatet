import React from 'react';
import { supabase } from '@/lib/supabase';
import { NotebookPen, LogOut } from 'lucide-react';

export default function PaymentPage() {
  const paymentUrl = import.meta.env.VITE_MAYAR_PAYMENT_URL || '#';

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-3 shadow-sm text-primary-foreground">
          <NotebookPen size={24} />
        </div>
        <h1 className="text-xl font-bold text-foreground">TemanNyatet</h1>
      </div>

      <div className="w-full max-w-sm bg-card rounded-2xl shadow-md p-6 border border-border">
        <h2 className="text-2xl font-bold text-foreground mb-2">Satu langkah lagi!</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Aktivasi akun kamu untuk mulai mencatat sat-set tanpa batas.
        </p>

        <div className="flex flex-col gap-4">
          <div className="border border-border rounded-xl p-4 flex flex-col">
            <h3 className="font-semibold text-lg">Bulanan</h3>
            <p className="text-2xl font-bold mt-1 mb-4">Rp 100.000<span className="text-sm font-normal text-muted-foreground"> / bulan</span></p>
            <a 
              href={paymentUrl} 
              className="w-full py-2.5 rounded-full border-2 border-primary text-primary font-semibold text-center hover:bg-primary/5 transition-colors"
            >
              Pilih Bulanan
            </a>
          </div>

          <div className="border-2 border-primary rounded-xl p-4 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              REKOMENDASI
            </div>
            <h3 className="font-semibold text-lg text-primary">Tahunan</h3>
            <p className="text-2xl font-bold mt-1 mb-4">Rp 249.000<span className="text-sm font-normal text-muted-foreground"> / tahun</span></p>
            <a 
              href={paymentUrl} 
              className="w-full py-2.5 rounded-full bg-primary text-primary-foreground font-semibold text-center hover:opacity-90 shadow-sm transition-opacity"
            >
              Pilih Tahunan
            </a>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Setelah pembayaran, akun aktif otomatis.
        </p>
      </div>

      <button 
        onClick={handleLogout}
        className="mt-8 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        <LogOut size={16} /> Keluar
      </button>
    </div>
  );
}
