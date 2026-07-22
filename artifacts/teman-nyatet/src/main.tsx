import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import App from './App';
import './index.css';

// Attach Supabase access token to all generated API hook requests.
setAuthTokenGetter(async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
});

// Register Workbox-generated service worker via vite-plugin-pwa.
// When a new SW is waiting, we fire a custom event so PwaUpdatePrompt
// can show an in-app "Perbarui" banner instead of reloading silently.
registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new Event('pwa:update-available'));
  },
  onOfflineReady() {
    // App is ready to work offline — could show a toast here if needed.
  },
});

createRoot(document.getElementById('root')!).render(<App />);
