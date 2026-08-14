import { useEffect, useState } from 'react';

/**
 * Estimated on-screen keyboard height in pixels, or 0 when no soft keyboard is
 * visible.
 *
 * `position: fixed` elements are anchored to the *layout* viewport, so on iOS
 * Safari (and in some Android embeds) a bottom-anchored FAB ends up hidden
 * behind the keyboard while a text field is focused. The `visualViewport`
 * reports the area the user can actually see, so the difference between it and
 * `innerHeight` is the space taken by the keyboard (plus any collapsing
 * browser chrome).
 *
 * A minimum threshold keeps transient chrome changes (e.g. the URL bar
 * collapsing on scroll) from nudging the button around — only a real keyboard
 * opens the lift.
 */
const KEYBOARD_THRESHOLD_PX = 100;

export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const viewport = window.visualViewport;

    const update = () => {
      const delta = Math.max(0, Math.round(window.innerHeight - viewport.height));
      // Keep the value stable while the keyboard is open so the FAB does not
      // jump between thresholds; small jitter is ignored entirely.
      setHeight(delta > KEYBOARD_THRESHOLD_PX ? delta : 0);
    };

    update();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return height;
}
