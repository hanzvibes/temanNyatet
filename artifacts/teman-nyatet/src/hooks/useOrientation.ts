import { useSyncExternalStore } from 'react';

type Orientation = 'portrait' | 'landscape';

function getOrientation(): Orientation {
  if (typeof window === 'undefined') return 'portrait';
  return window.matchMedia('(orientation: landscape)').matches
    ? 'landscape'
    : 'portrait';
}

function subscribe(callback: () => void) {
  const mediaQuery = window.matchMedia('(orientation: landscape)');
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', callback);
    return () => mediaQuery.removeEventListener('change', callback);
  }
  // Safari versions used by older installed PWAs expose the legacy listener.
  mediaQuery.addListener(callback);
  return () => mediaQuery.removeListener(callback);
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
