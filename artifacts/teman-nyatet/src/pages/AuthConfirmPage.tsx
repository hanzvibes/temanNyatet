import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';

function useConfirmationParams() {
  if (typeof window === 'undefined') {
    return { token_hash: null, type: null, next: null };
  }
  const params = new URLSearchParams(window.location.search);
  const rawType = params.get('type');
  // Supabase email templates may emit type=signup for new registrations.
  // The verifyOtp API treats the confirmation action as type='email'.
  const type =
    rawType === 'signup' || rawType === 'email'
      ? 'email'
      : (rawType as 'email' | 'recovery' | 'invite' | 'magiclink' | 'email_change' | null);
  return {
    token_hash: params.get('token_hash'),
    type,
    next: params.get('next') || '/login',
  };
}

export default function AuthConfirmPage() {
  const { token_hash, type, next } = useConfirmationParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token_hash || !type) {
      setStatus('error');
      setErrorMessage('Link konfirmasi tidak valid atau sudah kedaluwarsa.');
      return;
    }

    let isMounted = true;

    const verify = async () => {
      try {
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });
        if (!isMounted) return;

        if (error) {
          setStatus('error');
          setErrorMessage(error.message || 'Gagal memverifikasi email. Link mungkin sudah kedaluwarsa.');
          return;
        }

        setStatus('success');
        // Give the user a moment to read the success message before redirecting.
        setTimeout(() => {
          if (isMounted) {
            window.location.href = next;
          }
        }, 1500);
      } catch (err) {
        if (!isMounted) return;
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Terjadi kesalahan saat memverifikasi email.');
      }
    };

    verify();

    return () => {
      isMounted = false;
    };
  }, [token_hash, type, next]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-5 sm:p-6 bg-background">
      <div className="w-full max-w-sm text-center">
        {status === 'verifying' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-section-title">Memverifikasi email…</h1>
            <p className="text-muted-foreground mt-2 font-medium">Tunggu sebentar ya.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-income mx-auto mb-4" />
            <h1 className="text-section-title">Email Terverifikasi</h1>
            <p className="text-muted-foreground mt-2 font-medium">Kamu akan diarahkan ke halaman login.</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-section-title">Verifikasi Gagal</h1>
            <p className="text-muted-foreground mt-2 font-medium">{errorMessage}</p>
            <Button
              type="button"
              onClick={() => { window.location.href = '/login'; }}
              className="mt-6 w-full rounded-full"
              size="lg"
            >
              Kembali ke Login
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
