import React, { useEffect, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import AuthForm from '@/components/AuthForm';

type AuthDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: 'login' | 'register';
  onSuccess?: () => void;
};

/**
 * Login / Sign up dialog that lives inside the landing page — one seamless
 * experience instead of a separate auth route.
 *
 * - Mobile: full-width bottom sheet (native feel, safe-area aware).
 * - sm+: centered modal card.
 * - Radix handles focus trap, ESC to close, focus return, aria-modal and
 *   body scroll-lock; enter/exit use tw-animate-css data-state animations
 *   (slide-up on mobile, fade+zoom+rise on desktop). The app-wide
 *   `data-motion` kill-switch in index.css disables these for
 *   reduced-motion / off users automatically.
 */
export default function AuthDialog({
  open,
  onOpenChange,
  initialMode = 'login',
  onSuccess,
}: AuthDialogProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  // CTAs can request a specific tab ("Mulai Gratis" → register). Apply it each
  // time the dialog opens so repeated opens always start where the user tapped.
  useEffect(() => {
    if (open) setMode(initialMode);
  }, [open, initialMode]);

  const title = mode === 'login' ? 'Selamat datang kembali' : 'Buat akun gratis';
  const description =
    mode === 'login'
      ? 'Masuk untuk melanjutkan catatan kamu.'
      : 'Mulai mencatat sat-set dalam hitungan detik.';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-[70] bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 motion-reduce:animate-none"
        />
        <div className="pointer-events-none fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
          <DialogPrimitive.Content
            className={[
              'pointer-events-auto relative flex w-full flex-col overflow-hidden',
              'rounded-t-[2rem] border border-card-border bg-card shadow-elevation-3 outline-none',
              'max-h-[92dvh] sm:max-h-[85dvh] sm:max-w-md sm:rounded-[2rem]',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full',
              'sm:data-[state=closed]:slide-out-to-bottom-4 sm:data-[state=open]:slide-in-from-bottom-4',
              'sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95',
              'motion-reduce:animate-none',
            ].join(' ')}
          >
            {/* Drag handle — mobile affordance only */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-2.5 h-1.5 w-10 -translate-x-1/2 rounded-full bg-border sm:hidden"
            />

            <div className="overflow-y-auto overscroll-contain px-6 pb-[max(2.25rem,env(safe-area-inset-bottom))] pt-10 sm:px-8 sm:pt-8">
              {/* Header */}
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <DialogPrimitive.Title className="text-modal-title">
                    {title}
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="mt-1.5 text-sm text-muted-foreground">
                    {description}
                  </DialogPrimitive.Description>
                </div>
                <DialogPrimitive.Close
                  aria-label="Tutup"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <X size={20} />
                </DialogPrimitive.Close>
              </div>

              <AuthForm
                mode={mode}
                onModeChange={setMode}
                onSuccess={onSuccess}
              />
            </div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
