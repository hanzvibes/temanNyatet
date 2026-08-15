import React from 'react';
import { MotionConfig } from 'framer-motion';
import { useAppearance } from '@/hooks/useAppearance';

/**
 * Applies the user's Animation & Motion preference (Settings → Appearance) to
 * every framer-motion animation in the tree:
 *   - `full`    → animations always play, ignoring the OS reduced-motion flag
 *   - `reduced` → transform/layout animations are skipped everywhere
 *   - `off`     → reduced, plus all default transition durations become zero
 *
 * CSS transitions/animations are handled separately via `data-motion` on
 * <html> (see index.css); this provider only covers JS-driven framer motion.
 */
export default function MotionConfigProvider({ children }: { children: React.ReactNode }) {
  const { prefs } = useAppearance();
  const motion = prefs.motion;

  return (
    <MotionConfig
      reducedMotion={motion === 'full' ? 'never' : 'always'}
      transition={motion === 'off' ? { duration: 0 } : undefined}
    >
      {children}
    </MotionConfig>
  );
}
