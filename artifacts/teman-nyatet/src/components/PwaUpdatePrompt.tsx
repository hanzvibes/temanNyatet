// Shows a toast when a new SW version is waiting to activate.
// Clicking "Perbarui" reloads the page so the new SW takes over.
import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface PwaUpdatePromptProps {
  onUpdate?: () => void;
}

// Listens for the custom event emitted by registerSW in main.tsx
export default function PwaUpdatePrompt({ onUpdate }: PwaUpdatePromptProps) {
  const [needRefresh, setNeedRefresh] = useState(false);

  useEffect(() => {
    const handler = () => setNeedRefresh(true);
    window.addEventListener('pwa:update-available', handler);
    return () => window.removeEventListener('pwa:update-available', handler);
  }, []);

  if (!needRefresh) return null;

  const handleUpdate = () => {
    onUpdate?.();
    window.location.reload();
  };

  return (
    <div
      className="fixed top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm
                 bg-foreground text-background shadow-lg rounded-2xl px-4 py-3 flex items-center
                 gap-3 z-50 animate-in slide-in-from-top-4"
    >
      <RefreshCw className="w-4 h-4 flex-shrink-0 opacity-80" />
      <p className="text-sm flex-1">Versi baru tersedia!</p>
      <button
        onClick={handleUpdate}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-background/15
                   hover:bg-background/25 transition-colors whitespace-nowrap"
      >
        Perbarui
      </button>
    </div>
  );
}
