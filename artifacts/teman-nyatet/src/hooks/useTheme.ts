import { useCallback, useEffect, useState } from 'react';

/**
 * Theme mode chosen by the user.
 *
 *   - `light`  → force light canvas, ignore OS preference
 *   - `dark`   → force dark canvas, ignore OS preference
 *   - `system` → follow `prefers-color-scheme` and update live
 *
 * The chosen mode is persisted to `localStorage` under `teman-nyatet:theme`.
 * On boot, `main.tsx` reads the same key and applies the `.dark` class to
 * `<html>` synchronously (before the first paint) so there is no FOUC.
 */
export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'teman-nyatet:theme';

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  } catch {
    // localStorage can throw in private-mode iframes; not fatal.
  }
  return 'light';
}

/** Synchronously computes the effective theme from the stored mode + OS pref. */
export function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Applies the mode to `<html>` immediately. Idempotent. Synchronous. */
export function applyThemeToDom(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const effective = resolveTheme(mode);
  document.documentElement.classList.toggle('dark', effective === 'dark');
}

/**
 * React hook for the theme. The first call also drives the initial DOM
 * application for any component that mounts before `main.tsx`'s `bootTheme`
 * (today, that's nothing — but a future settings-preload could mount this
 * hook above the tree, so the hook remains self-sufficient).
 */
export function useTheme(): { mode: ThemeMode; setMode: (next: ThemeMode) => void } {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  useEffect(() => {
    applyThemeToDom(mode);

    // When the user picked `system`, keep listening to OS preference changes.
    if (mode !== 'system') return;
    if (typeof window === 'undefined') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeToDom('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore quota / privacy-mode errors; in-memory state still works.
    }
    applyThemeToDom(next);
  }, []);

  return { mode, setMode };
}
