// Shows a small banner at the top when the browser is offline.
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      aria-live="assertive"
      aria-atomic="true"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2
                 bg-amber-500 text-white px-4 py-2 text-xs font-medium
                 animate-in slide-in-from-top-2"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Tidak ada koneksi internet</span>
    </div>
  );
}
