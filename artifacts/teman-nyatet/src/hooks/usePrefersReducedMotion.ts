import { useEffect, useState } from 'react';
import { APPEARANCE_CHANGED_EVENT } from '@/hooks/useAppearance';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Reads the user's own Animation & Motion preference (Settings → Appearance)
 * ahead of the OS setting:
 *   - `full`    → animations always play, even if the OS prefers reduced motion
 *   - `reduced` → treat as reduced (transform/layout motion skipped)
 *   - `off`     → treat as reduced
 *   - unset     → fall back to the OS `prefers-reduced-motion` setting
 */
function readMotionPref(): 'full' | 'reduced' | 'off' | null {
  try {
    const raw = window.localStorage.getItem('teman-nyatet:appearance');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { motion?: unknown };
    if (parsed.motion === 'full' || parsed.motion === 'reduced' || parsed.motion === 'off') {
      return parsed.motion;
    }
  } catch {
    // Ignore storage / parse errors; OS preference applies.
  }
  return null;
}

function osPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(() => {
    const pref = readMotionPref();
    if (pref) return pref !== 'full';
    return osPrefersReducedMotion();
  });

  useEffect(() => {
    const pref = readMotionPref();
    if (pref) {
      setReducedMotion(pref !== 'full');
      return;
    }

    const mediaQuery = window.matchMedia(QUERY);
    const update = () => setReducedMotion(mediaQuery.matches);

    update();
    mediaQuery.addEventListener?.('change', update);
    return () => mediaQuery.removeEventListener?.('change', update);
  }, []);

  // Keep in sync when the user changes the preference live in Settings.
  useEffect(() => {
    const sync = () => {
      const pref = readMotionPref();
      if (pref) setReducedMotion(pref !== 'full');
    };
    window.addEventListener(APPEARANCE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(APPEARANCE_CHANGED_EVENT, sync);
  }, []);

  return reducedMotion;
}
