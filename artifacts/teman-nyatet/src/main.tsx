import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { setAuthTokenGetter } from '@workspace/api-client-react';
import { supabase } from '@/lib/supabase';
import App from './App';
import type { ThemeMode } from '@/hooks/useTheme';
import { resolveTheme } from '@/hooks/useTheme';
import { applyAppearanceToDom, FONT_FAMILIES, RADIUS_VALUES, type AppearancePrefs } from '@/hooks/useAppearance';
import './index.css';

// ── Theme bootstrap (runs synchronously before first paint) ─────────────────
// Reads the stored theme preference and applies `.dark` to <html> so the
// first paint matches the user's choice. Without this, light/dark mode flips
// only after the SettingsSheet mounts — which produces a visible flash on
// dark-mode users (cream canvas → slate canvas). Reading localStorage and
// toggling a class is cheap, and the `.dark` CSS tokens are already loaded
// by the time `index.css` finishes parsing.
(function bootTheme() {
  let mode: ThemeMode = 'light';
  try {
    const raw = window.localStorage.getItem('teman-nyatet:theme');
    if (raw === 'light' || raw === 'dark' || raw === 'system') mode = raw;
  } catch {
    // Private-mode iframes throw on localStorage reads; ignore.
  }
  const effective = resolveTheme(mode);
  document.documentElement.classList.toggle('dark', effective === 'dark');
})();

// ── Appearance bootstrap (runs synchronously before first paint) ─────────────
// Reads font and radius preferences from localStorage and applies CSS variable
// overrides to <html> so the first paint uses the user's chosen font and
// corner radius without any flash.
(function bootAppearance() {
  const prefs: AppearancePrefs = { font: 'inter', radius: 'default' };
  try {
    const raw = window.localStorage.getItem('teman-nyatet:appearance');
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
      if (parsed.font && parsed.font in FONT_FAMILIES) prefs.font = parsed.font;
      if (parsed.radius && parsed.radius in RADIUS_VALUES) prefs.radius = parsed.radius;
    }
  } catch {
    // Ignore storage / parse errors; defaults apply.
  }
  applyAppearanceToDom(prefs);
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
const rootElement = document.getElementById('root')!;
// The inline shell in index.html is useful while the module graph is cold.
// Mark it as consumed before React mounts so its timeout cannot show a retry
// prompt over a healthy app.
rootElement.dataset.bootShell = 'false';
const root = createRoot(rootElement);
root.render(<App />);

function registerServiceWorker() {
  // Development uses Vite's module graph directly. Registering a synthetic
  // service worker there adds cache checks and can make local/PWA-like previews
  // feel slower without improving the production install.
  if (!import.meta.env.PROD) return;

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
    // updateSW is returned by registerSW and lets us force-reload the page so
    // the newly-activated SW's fresh assets are used immediately.
    const updateSW = registerSW({
      // Don't force an update check synchronously on first paint; let the app
      // render first, then check for updates in the background.
      immediate: false,
      onNeedRefresh() {
        // With registerType:'autoUpdate', the new SW has already called
        // skipWaiting and is now the active SW. Reload the page so the browser
        // fetches JS/CSS from the new SW's precache instead of stale chunks.
        // We do this silently — no user prompt — to guarantee users always
        // run the latest version. Data is never lost because the app persists
        // everything to the server before any reload can happen.
        updateSW(true);
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
