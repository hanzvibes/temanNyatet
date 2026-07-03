import React from 'react';
import { supabase } from '@/lib/supabase';
import { Lock, LogOut } from 'lucide-react';

export default function ArchivedPage() {
  const paymentUrl = import.meta.env.VITE_MAYAR_PAYMENT_URL || '#';

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm bg-card rounded-2xl shadow-md p-8 text-center border border-border">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="text-muted-foreground" size={32} />
        </div>
        
        <h1 className="text-2xl font-bold text-foreground mb-3">Akun Diarsipkan</h1>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
          Subscription kamu sudah berakhir. Perpanjang untuk melanjutkan mencatat dengan TemanNyatet.
        </p>

        <a 
          href={paymentUrl}
          className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-full shadow-sm hover:opacity-90 transition-opacity block"
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
