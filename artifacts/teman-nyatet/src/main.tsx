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

// Render the app first. On iOS (and especially home-screen PWAs), service
// worker registration can fail or take time; it should never block React from
// mounting the UI. A blank/white screen on launch is often caused by a SW or
// an auth call running before the root component renders.
const root = createRoot(document.getElementById('root')!);
root.render(<App />);

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers are not supported in this browser.');
    return;
  }

  // iOS/Safari and some in-app browsers only allow SWs on secure origins.
  const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';
  if (!isSecure) {
    console.warn('[PWA] Service worker registration skipped on non-secure origin.');
    return;
  }

  try {
    registerSW({
      // Don't force an update check synchronously on first paint; let the app
      // render first, then check for updates in the background.
      immediate: false,
      onNeedRefresh() {
        window.dispatchEvent(new Event('pwa:update-available'));
      },
      onOfflineReady() {
        // App is ready to work offline — could show a toast here if needed.
      },
      onRegisterError(error) {
        console.warn('[PWA] Service worker registration error:', error);
      },
    });
  } catch (err) {
    console.warn('[PWA] Service worker registration threw:', err);
  }
}

// Defer SW registration slightly so the initial paint is prioritized.
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(registerServiceWorker);
} else {
  setTimeout(registerServiceWorker, 1000);
}
