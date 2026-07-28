import { motion, type HTMLMotionProps } from 'framer-motion';

type AnimatedListItemProps = HTMLMotionProps<'div'> & {
  index?: number;
};

// Wraps list items with a smooth mount/unmount/resize animation.
// Use inside an <AnimatePresence> parent so items fade + slide when they
// enter or leave the list.
export function AnimatedListItem({
  index = 0,
  layout = true,
  ...props
}: AnimatedListItemProps) {
  return (
    <motion.div
      layout={layout}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.2,
        delay: Math.min(index * 0.02, 0.16),
        ease: [0.2, 0.8, 0.2, 1],
        layout: { duration: 0.18, ease: [0.2, 0.8, 0.2, 1] },
      }}
      {...props}
    />
  );
}
