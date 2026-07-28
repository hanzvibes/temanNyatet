import { type ReactNode } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { Trash2, Loader2 } from 'lucide-react';

const SWIPE_THRESHOLD = 100;
const SWIPE_MAX = -180;

interface SwipeableRowProps {
  id: string;
  isDeleting: boolean;
  onDelete: (id: string) => void;
  children: ReactNode;
  accentColor?: string;
}

/**
 * Generic swipe‑to‑delete wrapper.
 * Swipe left to reveal a red delete zone; past the threshold the row
 * flings off‑screen and onDelete fires after a brief delay.
 */
export function SwipeableRow({
  id,
  isDeleting,
  onDelete,
  children,
  accentColor,
}: SwipeableRowProps) {
  const x = useMotionValue(0);
  const progress = useTransform(x, [0, -SWIPE_THRESHOLD], [0, 1]);
  const trashScale = useTransform(progress, [0, 0.75, 1], [0.35, 0.95, 1.15]);
  const trashOpacity = useTransform(progress, [0, 0.4, 1], [0, 0.35, 1]);

  const handleDragEnd = (
    _: any,
    info: { offset: { x: number }; velocity: { x: number } },
  ) => {
    const pastThreshold =
      info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -300;
    if (pastThreshold) {
      animate(x, -600, {
        type: 'spring',
        stiffness: 400,
        damping: 26,
        mass: 0.8,
      });
      setTimeout(() => onDelete(id), 180);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 32 });
    }
  };

  const accentBorder = accentColor ? `border-l-${accentColor}/30` : 'border-l-destructive/20';

  return (
    <div className="relative overflow-hidden rounded-[1.25rem]">
      <div
        className={`absolute inset-y-0 right-0 z-0 flex items-center justify-center w-[130px] bg-destructive/10 rounded-r-[1.25rem] border-l ${accentBorder}`}
      >
        <motion.div
          style={{ scale: trashScale, opacity: trashOpacity }}
          className="flex flex-col items-center gap-1.5 select-none"
        >
          {isDeleting ? (
            <Loader2 size={22} strokeWidth={2.5} className="text-destructive animate-spin" />
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

      <motion.div
        drag="x"
        dragConstraints={{ left: SWIPE_MAX, right: 0 }}
        dragElastic={0.12}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="relative z-10 will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}
