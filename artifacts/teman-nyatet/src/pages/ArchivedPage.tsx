import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { openPaymentCheckout } from '@/lib/payment';
import { Button } from '@/components/ui/button';

export default function ArchivedPage() {
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      await openPaymentCheckout('yearly');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyiapkan pembayaran. Coba lagi.');
    } finally {
      setCheckoutLoading(false);
    }
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

        <Button
          type="button"
          onClick={() => void handleCheckout()}
          disabled={checkoutLoading}
          size="lg"
          className="w-full rounded-xl"
        >
          {checkoutLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            'Perpanjang Subscription'
          )}
        </Button>
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
