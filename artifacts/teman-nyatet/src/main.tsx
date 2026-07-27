import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import App from './App';
import type { ThemeMode } from '@/hooks/useTheme';
import { resolveTheme } from '@/hooks/useTheme';
import './index.css';

// ── Theme bootstrap (runs synchronously before first paint) ─────────────────
// Reads the stored theme preference and applies `.dark` to <html> so the
// first paint matches the user's choice. Without this, light/dark mode flips
// only after the SettingsSheet mounts — which produces a visible flash on
// dark-mode users (cream canvas → slate canvas). Reading localStorage and
// toggling a class is cheap, and the `.dark` CSS tokens are already loaded
// by the time `index.css` finishes parsing.
(function bootTheme() {
  let mode: ThemeMode = 'system';
  try {
    const raw = window.localStorage.getItem('teman-nyatet:theme');
    if (raw === 'light' || raw === 'dark' || raw === 'system') mode = raw;
  } catch {
    // Private-mode iframes throw on localStorage reads; ignore.
  }
  const effective = resolveTheme(mode);
  document.documentElement.classList.toggle('dark', effective === 'dark');
})();

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

// Defer SW registration so the initial paint is prioritized, but cap the
// delay so offline/PWA behavior still becomes available on idle-constrained
// browsers.
if ('requestIdleCallback' in window) {
  window.requestIdleCallback(registerServiceWorker, { timeout: 4000 });
} else {
  setTimeout(registerServiceWorker, 1000);
}
