import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Check } from 'lucide-react';

interface DeleteTargetProps {
  isDragging: boolean;
  isOverDelete: boolean;
  deleteConfirmed: boolean;
}

/**
 * A floating delete-zone bar that appears above the bottom navigation
 * during drag. Three visual tiers:
 *
 * 1. Idle (dragging, far) — dashed border, semi-transparent, neutral
 * 2. Hot (near / over)    — full red glow, solid border, pulsing
 * 3. Confirmed            — checkmark flash before fade-out
 *
 * Positioned at `bottom-36` on mobile (above the 96px nav pill + margin)
 * and `bottom-24` on desktop (above the sidebar nav equivalent).
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
          initial={{ opacity: 0, scale: 0.8, y: 16 }}
          animate={
            deleteConfirmed
              ? { opacity: 1, scale: 1.1, y: 0 }
              : isOverDelete
                ? { opacity: 1, scale: 1.04, y: 0 }
                : { opacity: 0.65, scale: 0.92, y: 0 }
          }
          exit={{ opacity: 0, scale: 0.6, y: 12 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28, mass: 0.7 }}
          // Positioned well above the bottom-nav pill (96px tall + 12px gap)
          // on mobile, and above the pb-16 safe zone on desktop.
          className="fixed bottom-36 lg:bottom-24 left-1/2 -translate-x-1/2 z-[200] pointer-events-none w-[calc(100%-2.5rem)] max-w-md"
        >
          <div
            className={[
              'relative flex items-center justify-center gap-3 w-full py-4 rounded-2xl backdrop-blur-xl border-2 shadow-2xl transition-all duration-200 overflow-hidden',
              deleteConfirmed
                ? 'bg-destructive/25 border-destructive shadow-destructive/30'
                : isOverDelete
                  ? 'bg-destructive/15 border-destructive shadow-destructive/25'
                  : 'bg-card/80 border-dashed border-border/50 shadow-black/10 dark:shadow-black/30',
            ].join(' ')}
          >
            {/* Background wash when hot */}
            {isOverDelete && !deleteConfirmed && (
              <motion.div
                className="absolute inset-0 bg-destructive/10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}

            <div
              className={[
                'p-2.5 rounded-full transition-all duration-200 relative z-10',
                deleteConfirmed
                  ? 'bg-destructive/30'
                  : isOverDelete
                    ? 'bg-destructive/20 scale-110'
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
                  className={`transition-all duration-200 ${
                    isOverDelete ? 'text-destructive' : 'text-muted-foreground'
                  }`}
                />
              )}
            </div>
            <span
              className={[
                'font-bold text-sm transition-all duration-200 select-none relative z-10',
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

            {/* Expanding pulse ring when hot */}
            {isOverDelete && !deleteConfirmed && (
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-destructive/40"
                initial={{ opacity: 0.7, scale: 1 }}
                animate={{ opacity: 0, scale: 1.08 }}
                transition={{ duration: 0.8, repeat: Infinity, ease: 'easeOut' }}
              />
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
