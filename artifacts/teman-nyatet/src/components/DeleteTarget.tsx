import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Check } from 'lucide-react';

interface DeleteTargetProps {
  isDragging: boolean;
  isOverDelete: boolean;
  deleteConfirmed: boolean;
}

/**
 * Icon-only floating delete target that appears during drag.
 *
 * States:
 * 1. Idle — small translucent circle, gentle bob animation
 * 2. Hot  — scales up, red glow, icon wobbles, expanding ripple rings
 * 3. Confirmed — checkmark burst with spring pop, then fades out
 */
export function DeleteTarget({
  isDragging,
  isOverDelete,
  deleteConfirmed,
}: DeleteTargetProps) {
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

          {/* ── Main circular button ── */}
          <motion.div
            className={[
              'flex items-center justify-center rounded-full shadow-2xl backdrop-blur-xl border-2 transition-colors duration-150',
              deleteConfirmed
                ? 'bg-destructive/25 border-destructive shadow-destructive/30'
                : isOverDelete
                  ? 'bg-destructive/20 border-destructive shadow-destructive/25'
                  : 'bg-card/80 border-border/40 shadow-black/10 dark:shadow-black/30',
            ].join(' ')}
            initial={{ opacity: 0, scale: 0.25 }}
            animate={
              deleteConfirmed
                ? { opacity: 1, scale: 1.35 }
                : isOverDelete
                  ? { opacity: 1, scale: 1.18 }
                  : { opacity: 0.5, scale: 0.82, y: [0, -3, 0] }
            }
            exit={{ opacity: 0, scale: 0.15, transition: { duration: 0.15 } }}
            transition={
              isOverDelete || deleteConfirmed
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
            {deleteConfirmed ? (
              /* Confirmed: checkmark springs in */
              <motion.div
                initial={{ scale: 0, rotate: -45 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 16 }}
              >
                <Check size={26} strokeWidth={3} className="text-destructive" />
              </motion.div>
            ) : (
              /* Trash icon with wobble when hot */
              <motion.div
                animate={
                  isOverDelete
                    ? {
                        rotate: [0, -14, 9, -7, 4, 0],
                        scale: [1, 1.15, 0.93, 1.06, 1],
                      }
                    : { rotate: 0, scale: 1 }
                }
                transition={{ duration: 0.55, ease: 'easeInOut' }}
              >
                <Trash2
                  size={26}
                  strokeWidth={2.5}
                  className={
                    isOverDelete ? 'text-destructive' : 'text-muted-foreground'
                  }
                />
              </motion.div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
