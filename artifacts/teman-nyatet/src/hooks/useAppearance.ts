import { useCallback, useEffect, useState } from 'react';

export type AppFont = 'inter' | 'plus-jakarta-sans' | 'dm-sans' | 'nunito';
export type AppRadius = 'compact' | 'default' | 'rounded' | 'pill';
export type AppPalette = 'classic' | 'ocean' | 'forest' | 'lavender' | 'sunset' | 'custom';
export type AppTextScale = 'small' | 'default' | 'large' | 'xl';
export type AppDensity = 'compact' | 'comfortable' | 'spacious';
export type AppMotion = 'full' | 'reduced' | 'off';
export type AppGlass = 'none' | 'minimal' | 'default' | 'heavy';

export interface AppearancePrefs {
  font: AppFont;
  radius: AppRadius;
  palette: AppPalette;
  /** Hex accent used when palette === 'custom'. */
  customAccent: string;
  textScale: AppTextScale;
  density: AppDensity;
  motion: AppMotion;
  glass: AppGlass;
}

const STORAGE_KEY = 'teman-nyatet:appearance';

/** Broadcast whenever appearance prefs change so every mounted consumer
 *  (root MotionConfig, settings panel, reduced-motion helpers) stays in sync
 *  without needing prop drilling or a global store. */
export const APPEARANCE_CHANGED_EVENT = 'teman-nyatet:appearance-changed';

export const FONT_FAMILIES: Record<AppFont, string> = {
  'inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'plus-jakarta-sans': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  'dm-sans': "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  'nunito': "'Nunito', -apple-system, BlinkMacSystemFont, sans-serif",
};

export const RADIUS_VALUES: Record<AppRadius, string> = {
  'compact': '0.375rem',
  'default': '1rem',
  'rounded': '1.25rem',
  'pill': '1.5rem',
};

export const PALETTE_OPTIONS: ReadonlyArray<{
  value: AppPalette;
  label: string;
  description: string;
  swatches: readonly [string, string, string];
}> = [
  { value: 'classic', label: 'Klasik', description: 'Teal sage & amber', swatches: ['#18a07a', '#f59e0b', '#eef7f3'] },
  { value: 'ocean', label: 'Ocean', description: 'Biru & cyan', swatches: ['#0369a1', '#06b6d4', '#e0f2fe'] },
  { value: 'forest', label: 'Forest', description: 'Hijau & sage', swatches: ['#166534', '#65a30d', '#ecfccb'] },
  { value: 'lavender', label: 'Lavender', description: 'Ungu & violet', swatches: ['#6d28d9', '#c084fc', '#f3e8ff'] },
  { value: 'sunset', label: 'Sunset', description: 'Coral & amber', swatches: ['#c2410c', '#f97316', '#ffedd5'] },
];

/** Multipliers used by the typography roles in index.css via `--text-scale`. */
export const TEXT_SCALE_VALUES: Record<AppTextScale, number> = {
  'small': 0.9,
  'default': 1,
  'large': 1.08,
  'xl': 1.16,
};

const PALETTE_VALUES = new Set<AppPalette>(PALETTE_OPTIONS.map(({ value }) => value));
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const DEFAULT_PREFS: AppearancePrefs = {
  font: 'inter',
  radius: 'default',
  palette: 'classic',
  customAccent: '#18a07a',
  textScale: 'default',
  density: 'comfortable',
  motion: 'full',
  glass: 'default',
};

export function readStoredPrefs(): AppearancePrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<AppearancePrefs>;
    return {
      font: parsed.font && parsed.font in FONT_FAMILIES ? parsed.font : DEFAULT_PREFS.font,
      radius: parsed.radius && parsed.radius in RADIUS_VALUES ? parsed.radius : DEFAULT_PREFS.radius,
      palette:
        parsed.palette && (PALETTE_VALUES.has(parsed.palette) || parsed.palette === 'custom')
          ? parsed.palette
          : DEFAULT_PREFS.palette,
      customAccent:
        parsed.customAccent && HEX_RE.test(parsed.customAccent) ? parsed.customAccent : DEFAULT_PREFS.customAccent,
      textScale:
        parsed.textScale && parsed.textScale in TEXT_SCALE_VALUES ? parsed.textScale : DEFAULT_PREFS.textScale,
      density:
        parsed.density === 'compact' || parsed.density === 'spacious'
          ? parsed.density
          : DEFAULT_PREFS.density,
      motion:
        parsed.motion === 'full' || parsed.motion === 'reduced' || parsed.motion === 'off'
          ? parsed.motion
          : DEFAULT_PREFS.motion,
      glass:
        parsed.glass === 'none' || parsed.glass === 'minimal' || parsed.glass === 'heavy'
          ? parsed.glass
          : DEFAULT_PREFS.glass,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Extracts the hue (0–359) of a #rrggbb hex color. */
export function hexToHue(hex: string): number {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  if (delta === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / delta) % 6;
  else if (max === g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;
  return Math.round(h * 60 + 360) % 360;
}

/**
 * Applies appearance preferences to the DOM by overriding CSS variables on
 * <html>. Calling this synchronously before first paint (in main.tsx) prevents
 * any flash of default styling.
 */
export function applyAppearanceToDom(prefs: AppearancePrefs): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  // The chosen font drives both the body stack and the display stack, so the
  // "satu font untuk seluruh app" preference keeps working; the default
  // pairing (Plus Jakarta Sans headings + Inter body) comes from index.css.
  root.style.setProperty('--app-font-sans', FONT_FAMILIES[prefs.font]);
  root.style.setProperty('--app-font-display', FONT_FAMILIES[prefs.font]);
  root.style.setProperty('--radius', RADIUS_VALUES[prefs.radius]);
  root.dataset.palette = prefs.palette;
  root.dataset.textScale = prefs.textScale;
  root.dataset.density = prefs.density;
  root.dataset.motion = prefs.motion;
  root.dataset.glass = prefs.glass;
  if (prefs.palette === 'custom') {
    root.style.setProperty('--custom-h', String(hexToHue(prefs.customAccent)));
  }
}

/**
 * React hook for appearance preferences. Persists to localStorage and applies
 * CSS variable overrides to <html> reactively. Every mounted instance stays in
 * sync through APPEARANCE_CHANGED_EVENT.
 */
export function useAppearance() {
  const [prefs, setPrefsState] = useState<AppearancePrefs>(readStoredPrefs);

  useEffect(() => {
    applyAppearanceToDom(prefs);
  }, [prefs]);

  useEffect(() => {
    const sync = () => setPrefsState(readStoredPrefs());
    window.addEventListener(APPEARANCE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(APPEARANCE_CHANGED_EVENT, sync);
  }, []);

  const setPrefs = useCallback((next: Partial<AppearancePrefs>) => {
    setPrefsState(prev => {
      const updated = { ...prev, ...next };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Ignore quota / privacy-mode errors; in-memory state still works.
      }
      applyAppearanceToDom(updated);
      try {
        window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGED_EVENT));
      } catch {
        // Some environments disallow CustomEvent; state already updated.
      }
      return updated;
    });
  }, []);

  const resetPrefs = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore quota / privacy-mode errors.
    }
    applyAppearanceToDom(DEFAULT_PREFS);
    setPrefsState(DEFAULT_PREFS);
    try {
      window.dispatchEvent(new CustomEvent(APPEARANCE_CHANGED_EVENT));
    } catch {
      // Ignore.
    }
  }, []);

  return { prefs, setPrefs, resetPrefs };
}
