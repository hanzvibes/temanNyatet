// PWA install prompt — shows a bottom banner when the browser fires
// `beforeinstallprompt`. Dismissed per-session via local state.
import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!deferredPrompt || dismissed) return null;

  const handleInstall = async () => {
    await deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setDeferredPrompt(null);
    } else {
      setDismissed(true);
    }
  };

  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm
                 bg-white border border-border shadow-lg rounded-2xl px-4 py-3 flex items-center
                 gap-3 z-50 animate-in slide-in-from-bottom-4"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Download className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">Install TemanNyatet</p>
        <p className="text-xs text-muted-foreground mt-0.5">Akses cepat dari home screen</p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={handleInstall}
          className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg
                     bg-primary/10 hover:bg-primary/20 transition-colors"
        >
          Install
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground
                     hover:bg-muted transition-colors"
          aria-label="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
