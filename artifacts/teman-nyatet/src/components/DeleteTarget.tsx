import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Check } from 'lucide-react';

interface DeleteTargetProps {
  isDragging: boolean;
  isOverDelete: boolean;
  deleteConfirmed: boolean;
}

/**
 * A floating delete-zone pill that appears at the bottom of the screen
 * during drag. Three visual tiers:
 *
 * 1. Idle (dragging, far) — semi-transparent, small, neutral colours.
 * 2. Hot (near / over)    — opaque, scaled up, destructive red glow,
 *                            pulsing trash icon.
 * 3. Confirmed            — brief checkmark flash before the target
 *                            disappears (onDrop success).
 */
export function DeleteTarget({
  isDragging,
  isOverDelete,
  deleteConfirmed,
}: DeleteTargetProps) {
  return (
    <AnimatePresence>
      {isDragging && (
        <motion.div
          key="delete-target"
          initial={{ opacity: 0, scale: 0.6, y: 40 }}
          animate={
            deleteConfirmed
              ? { opacity: 1, scale: 1.15, y: 0 }
              : isOverDelete
                ? { opacity: 1, scale: 1.08, y: 0 }
                : { opacity: 0.55, scale: 0.85, y: 0 }
          }
          exit={{ opacity: 0, scale: 0.4, y: 30 }}
          transition={{ type: 'spring', stiffness: 350, damping: 24, mass: 0.8 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
        >
          <div
            className={[
              'flex items-center gap-3 px-6 py-3.5 rounded-2xl backdrop-blur-xl border-2 shadow-2xl transition-all duration-200',
              deleteConfirmed
                ? 'bg-destructive/20 border-destructive shadow-destructive/30'
                : isOverDelete
                  ? 'bg-destructive/15 border-destructive shadow-destructive/25'
                  : 'bg-card/80 border-border/50 shadow-black/10 dark:shadow-black/30',
            ].join(' ')}
          >
            <div
              className={[
                'p-2.5 rounded-full transition-all duration-200',
                deleteConfirmed
                  ? 'bg-destructive/30'
                  : isOverDelete
                    ? 'bg-destructive/20'
                    : 'bg-muted/80',
              ].join(' ')}
            >
              {deleteConfirmed ? (
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Check size={22} strokeWidth={3} className="text-destructive" />
                </motion.div>
              ) : (
                <Trash2
                  size={22}
                  strokeWidth={2.5}
                  className={[
                    'transition-all duration-200',
                    isOverDelete
                      ? 'text-destructive scale-110'
                      : 'text-muted-foreground',
                  ].join(' ')}
                />
              )}
            </div>
            <span
              className={[
                'font-bold text-sm transition-all duration-200 whitespace-nowrap select-none',
                deleteConfirmed
                  ? 'text-destructive'
                  : isOverDelete
                    ? 'text-destructive'
                    : 'text-muted-foreground',
              ].join(' ')}
            >
              {deleteConfirmed
                ? 'Dihapus'
                : isOverDelete
                  ? 'Lepas untuk menghapus'
                  : 'Seret ke sini untuk hapus'}
            </span>

            {/* Pulsing glow ring when hovered */}
            {isOverDelete && !deleteConfirmed && (
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-destructive/40"
                initial={{ opacity: 0.6, scale: 1 }}
                animate={{ opacity: 0, scale: 1.12 }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
