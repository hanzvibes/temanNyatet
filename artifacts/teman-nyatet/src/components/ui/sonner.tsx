'use client';

import { Toaster as Sonner } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LoaderCircle,
  X,
} from 'lucide-react';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="system"
      position="bottom-right"
      closeButton
      expand
      visibleToasts={3}
      offset={{ bottom: 24, right: 24 }}
      mobileOffset={{
        bottom: 'calc(var(--bottom-nav-collapsed-h) + 1rem)',
        left: '1rem',
        right: '1rem',
      }}
      icons={{
        success: <CheckCircle2 aria-hidden="true" />,
        error: <AlertTriangle aria-hidden="true" />,
        warning: <AlertTriangle aria-hidden="true" />,
        info: <Info aria-hidden="true" />,
        loading: <LoaderCircle aria-hidden="true" />,
        close: <X aria-hidden="true" />,
      }}
      className="toaster group"
      containerAriaLabel="Notifikasi TemanNyatet"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border-border group-[.toaster]:shadow-elevation-2',
          title: 'group-[.toast]:font-medium group-[.toast]:leading-snug',
          description: 'group-[.toast]:text-muted-foreground group-[.toast]:leading-relaxed',
          icon: 'group-[.toast]:size-5 group-[.toast]:shrink-0',
          success:
            'group-[.toast]:border-income/35 group-[.toast]:bg-income/10 group-[.toast]:text-income',
          error:
            'group-[.toast]:border-destructive/30 group-[.toast]:bg-destructive/10 group-[.toast]:text-destructive',
          warning:
            'group-[.toast]:border-finance/40 group-[.toast]:bg-finance/15 group-[.toast]:text-finance-text',
          info:
            'group-[.toast]:border-primary/25 group-[.toast]:bg-primary/10 group-[.toast]:text-primary',
          actionButton:
            'group-[.toast]:min-h-9 group-[.toast]:rounded-lg group-[.toast]:bg-primary group-[.toast]:px-3 group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:min-h-9 group-[.toast]:rounded-lg group-[.toast]:bg-muted group-[.toast]:px-3 group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:text-muted-foreground',
          closeButton:
            'group-[.toast]:rounded-full group-[.toast]:border-border group-[.toast]:bg-background group-[.toast]:text-muted-foreground hover:group-[.toast]:text-foreground',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
