import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';

type Orientation = 'portrait' | 'landscape';

function getOrientation(): Orientation {
  if (typeof window === 'undefined') return 'portrait';
  // Prefer the official Screen Orientation API when available.
  const angle = Math.abs(window.screen.orientation?.angle ?? 0);
  if (angle === 90 || angle === 270) return 'landscape';
  // Fallback to viewport aspect ratio (handles older devices / iOS).
  const vp = window.visualViewport;
  const width = vp?.width ?? window.innerWidth;
  const height = vp?.height ?? window.innerHeight;
  return width > height ? 'landscape' : 'portrait';
}

function subscribe(callback: () => void) {
  const onChange = () => callback();
  window.addEventListener('orientationchange', onChange);
  window.addEventListener('resize', onChange);
  window.visualViewport?.addEventListener('resize', onChange);
  return () => {
    window.removeEventListener('orientationchange', onChange);
    window.removeEventListener('resize', onChange);
    window.visualViewport?.removeEventListener('resize', onChange);
  };
}

export function useOrientation() {
  const orientation = useSyncExternalStore(
    subscribe,
    getOrientation,
    () => 'portrait' as Orientation
  );
  return {
    orientation,
    isLandscape: orientation === 'landscape',
    isPortrait: orientation === 'portrait',
  };
}

/** Classname helper that toggles a class based on current orientation. */
export function orientationClass(
  orientation: Orientation,
  classes: { portrait?: string; landscape?: string; default?: string }
): string {
  return [classes.default, orientation === 'landscape' ? classes.landscape : classes.portrait]
    .filter(Boolean)
    .join(' ');
}
