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
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      transition={{
        duration: 0.25,
        delay: Math.min(index * 0.03, 0.3),
        ease: [0.25, 0.1, 0.25, 1],
        layout: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
      }}
      {...props}
    />
  );
}
