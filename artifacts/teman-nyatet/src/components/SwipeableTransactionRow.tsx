import { type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trash2, Loader2 } from 'lucide-react';

const SWIPE_THRESHOLD = 100; // px — trigger deletion past this
const SWIPE_MAX = -180; // px — max drag distance

interface SwipeableTransactionRowProps {
  transactionId: string;
  isDeleting: boolean;
  onDelete: (id: string) => void;
  children: ReactNode;
  /** Outer wrapper className. Default gives rounded corners for standalone cards.
   *  Pass `"relative overflow-hidden"` (no radius) when the parent card handles rounding. */
  className?: string;
}

/**
 * Wraps a transaction row with a horizontal swipe‑to‑delete gesture.
 *
 * - Swiping left reveals a red trash zone.
 * - Past `SWIPE_THRESHOLD` (100 px) the card flings off‑screen and
 *   `onDelete` is called after a brief delay for the exit animation.
 * - Below threshold the card snaps back with a spring.
 * - Works on both touch (mobile) and mouse (desktop) — framer‑motion
 *   normalises the pointer automatically via `drag`.
 * - Vertical scrolling passes through unaffected (axis="x").
 */
export function SwipeableTransactionRow({
  transactionId,
  isDeleting,
  onDelete,
  children,
  className = 'relative overflow-hidden rounded-[1.25rem]',
}: SwipeableTransactionRowProps) {
  const x = useMotionValue(0);

  // Progress 0→1 as x goes from 0 to -SWIPE_THRESHOLD.
  // Past threshold = 1 (clamped).
  const progress = useTransform(x, [0, -SWIPE_THRESHOLD], [0, 1]);
  const trashScale = useTransform(progress, [0, 0.75, 1], [0.35, 0.95, 1.15]);
  const trashOpacity = useTransform(progress, [0, 0.4, 1], [0, 0.35, 1]);

  const handleDragEnd = (
    _: any,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    // Quick flick — check velocity even if offset is below threshold.
    const pastThreshold =
      info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -300;

    if (pastThreshold) {
      // Fling off screen
      animate(x, -600, {
        type: 'spring',
        stiffness: 400,
        damping: 26,
        mass: 0.8,
      });
      setTimeout(() => onDelete(transactionId), 180);
    } else {
      // Snap back to start
      animate(x, 0, {
        type: 'spring',
        stiffness: 500,
        damping: 32,
      });
    }
  };

  return (
    <div className={className}>
      {/* ── Trash zone (always present, hidden behind the card) ── */}
      <div className="absolute inset-y-0 right-0 z-0 flex items-center justify-center w-[130px] bg-destructive/10 border-l border-destructive/20">
        <motion.div
          style={{ scale: trashScale, opacity: trashOpacity }}
          className="flex flex-col items-center gap-1.5 select-none"
        >
          {isDeleting ? (
            <Loader2
              size={22}
              strokeWidth={2.5}
              className="text-destructive animate-spin"
            />
          ) : (
            <>
              <Trash2 size={22} strokeWidth={2.2} className="text-destructive" />
              <span className="text-[10px] font-bold text-destructive uppercase tracking-wider">
                Hapus
              </span>
            </>
          )}
        </motion.div>
      </div>

      {/* ── Foreground card (draggable) ── */}
      <motion.div
        drag="x"
        dragConstraints={{ left: SWIPE_MAX, right: 0 }}
        dragElastic={0.12}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}
