import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Check } from 'lucide-react';

interface DeleteTargetProps {
  isDragging: boolean;
  isOverDelete: boolean;
  deleteConfirmed: boolean;
}

/**
 * Icon-only floating delete target. Three modes:
 *
 * 1. Idle (dragging, far)   — translucent circle, gentle bob
 * 2. Hot (dragging, near)   — red glow, wobble, ripple rings
 * 3. Confirmed (deleting)   — slam → flash → checkmark → vanish
 */
export function DeleteTarget({
  isDragging,
  isOverDelete,
  deleteConfirmed,
}: DeleteTargetProps) {
  // Internal phase so the "slam" plays BEFORE the checkmark appears,
  // giving a satisfying "trash swallows the note" feel.
  const [phase, setPhase] = useState<'slam' | 'check' | 'vanish' | null>(null);
  const prevDeleteRef = useRef(false);

  useEffect(() => {
    if (deleteConfirmed && !prevDeleteRef.current) {
      setPhase('slam');
      const t1 = setTimeout(() => setPhase('check'), 300);
      const t2 = setTimeout(() => setPhase('vanish'), 500);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    if (!deleteConfirmed && phase !== null) setPhase(null);
    prevDeleteRef.current = deleteConfirmed;
    return;
  }, [deleteConfirmed, phase]);

  return (
    <AnimatePresence>
      {isDragging && (
        <div className="fixed bottom-36 lg:bottom-24 left-1/2 -translate-x-1/2 z-[200] pointer-events-none flex flex-col items-center">
          {/* ── Expanding ripple rings when hot ── */}
          <AnimatePresence>
            {isOverDelete && !deleteConfirmed && (
              <motion.div
                key="ripple-group"
                className="absolute inset-0 flex items-center justify-center"
              >
                {[0, 0.33, 0.66].map((delay, i) => (
                  <motion.div
                    key={i}
                    className="absolute rounded-full border-2"
                    style={{
                      width: 56,
                      height: 56,
                      borderColor:
                        i === 0
                          ? 'hsl(var(--destructive) / 0.3)'
                          : i === 1
                            ? 'hsl(var(--destructive) / 0.18)'
                            : 'hsl(var(--destructive) / 0.1)',
                    }}
                    initial={{ opacity: 0.5, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 2.2 }}
                    transition={{
                      duration: 1.1,
                      repeat: Infinity,
                      ease: 'easeOut',
                      delay,
                    }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Flash burst (trash swallowing the note) ── */}
          {phase === 'slam' && (
            <motion.div
              key="flash-burst"
              className="absolute rounded-full bg-destructive/20"
              initial={{ width: 56, height: 56, opacity: 0.6 }}
              animate={{ width: 220, height: 220, opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          )}

          {/* ── Main circle ── */}
          <motion.div
            className={[
              'flex items-center justify-center rounded-full shadow-2xl backdrop-blur-xl border-2',
              deleteConfirmed
                ? 'bg-destructive/25 border-destructive'
                : isOverDelete
                  ? 'bg-destructive/20 border-destructive shadow-destructive/25'
                  : 'bg-card/80 border-border/40 shadow-black/10 dark:shadow-black/30',
            ].join(' ')}
            initial={{ opacity: 0, scale: 0.25 }}
            animate={
              phase === 'slam'
                ? { scale: [1, 1.6, 1.2], opacity: 1 }
                : phase === 'check'
                  ? { scale: [1.2, 1.05], opacity: 1 }
                  : phase === 'vanish'
                    ? { scale: [1.05, 0.9, 0.3], opacity: [1, 0.8, 0] }
                    : isOverDelete
                      ? { opacity: 1, scale: 1.18 }
                      : { opacity: 0.5, scale: 0.82, y: [0, -3, 0] }
            }
            exit={{ opacity: 0, scale: 0.15, transition: { duration: 0.12 } }}
            transition={
              phase === 'slam'
                ? { duration: 0.4, ease: [0.34, 1.56, 0.64, 1], times: [0, 0.5, 1] }
                : phase === 'check'
                  ? { duration: 0.25, ease: 'easeOut' }
                  : phase === 'vanish'
                    ? { duration: 0.35, ease: 'easeIn' }
                    : isOverDelete
                      ? { type: 'spring', stiffness: 380, damping: 24, mass: 0.6 }
                      : {
                          type: 'spring',
                          stiffness: 380,
                          damping: 24,
                          mass: 0.6,
                          y: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
                        }
            }
            style={{ width: 56, height: 56 }}
          >
            {/* ── Trash or Checkmark ── */}
            {phase === 'slam' || phase === null || (!deleteConfirmed && !isOverDelete) ? (
              <motion.div
                animate={
                  phase === 'slam'
                    ? { rotate: [0, -15, 10, -5, 0], scale: [1, 1.3, 0.9, 1.1, 1] }
                    : isOverDelete
                      ? { rotate: [0, -14, 9, -7, 4, 0], scale: [1, 1.15, 0.93, 1.06, 1] }
                      : { rotate: 0, scale: 1 }
                }
                transition={{ duration: phase === 'slam' ? 0.4 : 0.55, ease: 'easeInOut' }}
              >
                <Trash2
                  size={26}
                  strokeWidth={2.5}
                  className={
                    phase === 'slam' || isOverDelete
                      ? 'text-destructive'
                      : 'text-muted-foreground'
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
              >
                <Check size={26} strokeWidth={3} className="text-destructive" />
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
