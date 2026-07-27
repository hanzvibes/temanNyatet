import { useCallback } from 'react';

/**
 * Lightweight haptic feedback helper.
 * Uses navigator.vibrate when available; falls back silently otherwise.
 * Patterns are in milliseconds (single number or array).
 */
export function useHaptic() {
  return useCallback((pattern: number | number[] | readonly number[] = 10) => {
    if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
    try {
      // Spread if it's an array so a readonly tuple becomes a mutable number[]
      // for the native vibrate API.
      const p: number | number[] = typeof pattern === 'number' ? pattern : [...pattern];
      navigator.vibrate(p);
    } catch {
      // Ignore unsupported patterns or denied permissions.
    }
  }, []);
}

export const HAPTIC = {
  tap: 10,
  success: [15, 40, 15],
  error: [40, 30, 40],
  delete: 50,
  reorder: 20,
} as const;
