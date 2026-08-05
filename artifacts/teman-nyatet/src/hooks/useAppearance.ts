import { useCallback, useEffect, useState } from 'react';

export type AppFont = 'inter' | 'plus-jakarta-sans' | 'dm-sans' | 'nunito';
export type AppRadius = 'compact' | 'default' | 'rounded' | 'pill';
export type AppPalette = 'classic' | 'ocean' | 'forest' | 'lavender' | 'sunset';

export interface AppearancePrefs {
  font: AppFont;
  radius: AppRadius;
  palette: AppPalette;
}

const STORAGE_KEY = 'teman-nyatet:appearance';

export const FONT_FAMILIES: Record<AppFont, string> = {
  'inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'plus-jakarta-sans': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  'dm-sans': "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  'nunito': "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
};

export const RADIUS_VALUES: Record<AppRadius, string> = {
  'compact': '0.375rem',
  'default': '0.75rem',
  'rounded': '1rem',
  'pill': '1.5rem',
};

export const PALETTE_OPTIONS: ReadonlyArray<{
  value: AppPalette;
  label: string;
  description: string;
  swatches: readonly [string, string, string];
}> = [
  { value: 'classic', label: 'Klasik', description: 'Charcoal & gold', swatches: ['#1a1a1a', '#d4af37', '#f5f5f5'] },
  { value: 'ocean', label: 'Ocean', description: 'Biru & cyan', swatches: ['#0369a1', '#06b6d4', '#e0f2fe'] },
  { value: 'forest', label: 'Forest', description: 'Hijau & sage', swatches: ['#166534', '#65a30d', '#ecfccb'] },
  { value: 'lavender', label: 'Lavender', description: 'Ungu & violet', swatches: ['#6d28d9', '#c084fc', '#f3e8ff'] },
  { value: 'sunset', label: 'Sunset', description: 'Coral & amber', swatches: ['#c2410c', '#f97316', '#ffedd5'] },
];

const PALETTE_VALUES = new Set<AppPalette>(PALETTE_OPTIONS.map(({ value }) => value));
const DEFAULT_PREFS: AppearancePrefs = { font: 'inter', radius: 'default', palette: 'classic' };

function readStoredPrefs(): AppearancePrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
    return {
      font: parsed.font && parsed.font in FONT_FAMILIES ? parsed.font : DEFAULT_PREFS.font,
      radius: parsed.radius && parsed.radius in RADIUS_VALUES ? parsed.radius : DEFAULT_PREFS.radius,
      palette: parsed.palette && PALETTE_VALUES.has(parsed.palette) ? parsed.palette : DEFAULT_PREFS.palette,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/**
 * Applies appearance preferences to the DOM by overriding CSS variables on
 * <html>. Calling this synchronously before first paint (in main.tsx) prevents
 * any flash of default styling.
 */
export function applyAppearanceToDom(prefs: AppearancePrefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--app-font-sans', FONT_FAMILIES[prefs.font]);
  root.style.setProperty('--radius', RADIUS_VALUES[prefs.radius]);
  root.dataset.palette = prefs.palette;
}

/**
 * React hook for appearance preferences. Persists to localStorage and applies
 * CSS variable overrides to <html> reactively.
 */
export function useAppearance() {
  const [prefs, setPrefsState] = useState<AppearancePrefs>(readStoredPrefs);

  useEffect(() => {
    applyAppearanceToDom(prefs);
  }, [prefs]);

  const setPrefs = useCallback((next: Partial<AppearancePrefs>) => {
    setPrefsState(prev => {
      const updated = { ...prev, ...next };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore quota / privacy-mode errors; in-memory state still works.
      }
      applyAppearanceToDom(updated);
      return updated;
    });
  }, []);

  return { prefs, setPrefs };
}
