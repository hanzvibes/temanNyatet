import React from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, LogOut } from 'lucide-react';

export default function ArchivedPage() {
  const paymentUrl = import.meta.env.VITE_MAYAR_PAYMENT_URL || '#';

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-5 sm:p-6 bg-background">
      <div className="w-full max-w-sm bg-card rounded-[1.5rem] shadow-elevation-2 p-8 text-center border border-card-border">
        <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mx-auto mb-6 border border-border">
          <Lock className="text-muted-foreground" size={32} />
        </div>
        
        <h1 className="text-page-title mb-3">Akun Diarsipkan</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Subscription kamu sudah berakhir. Perpanjang untuk melanjutkan mencatat dengan TemanNyatet.
        </p>

        <a 
          href={paymentUrl}
           className="w-full min-h-12 bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-xl shadow-elevation-1 hover:opacity-90 transition-opacity block"
        >
          Perpanjang Subscription
        </a>
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
