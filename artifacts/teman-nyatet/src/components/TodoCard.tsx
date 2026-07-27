import React, { useCallback } from 'react';
import {
  useSortable,
  type AnimateLayoutChanges,
  defaultAnimateLayoutChanges,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Check, GripVertical, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion } from 'framer-motion';
import type { Todo } from '@/lib/database.types';

// ── Palette color helper (deterministic from id) ───────────────────────────
const PALETTE_HUES = [210, 150, 320, 30, 190, 260];
function hueForId(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return PALETTE_HUES[Math.abs(hash) % PALETTE_HUES.length];
}

interface TodoCardProps {
  todo: Todo;
  onClick: () => void;
  onToggle: (e: React.MouseEvent) => void;
  disabled?: boolean;
  isDragOverlay?: boolean;
}

/**
 * Individual todo card with sortable drag‑and‑drop, spring checkbox,
 * and contextual styling.
 */
export function TodoCard({
  todo,
  onClick,
  onToggle,
  disabled,
  isDragOverlay,
}: TodoCardProps) {
  // ── Compute accent colour from id (stable) ──
  const hue = hueForId(todo.id);
  const accentLight = `hsla(${hue}, 55%, 75%, 0.25)`;
  const accentBorder = `hsla(${hue}, 45%, 60%, 0.3)`;

  // ── Animate layout changes for dnd-kit ──
  const animateLayoutChanges: AnimateLayoutChanges = (args) =>
    args.isSorting || args.wasDragging
      ? defaultAnimateLayoutChanges(args)
      : true;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: todo.id,
    disabled,
    animateLayoutChanges,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    zIndex: isDragging ? 50 : undefined,
    // Slight left shift when dragging so the slot opens visibly
    position: 'relative',
  };

  // Drag-overlay gets no transform but gets the lift styling
  const cardStyle = isDragOverlay
    ? { transform: `rotate(-1.5deg) scale(1.03)` }
    : {};

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
    [onClick],
  );

  const isOverdue =
    todo.due_date &&
    !todo.is_done &&
    new Date(todo.due_date + 'T23:59:59') < new Date();

  return (
    <motion.div
      ref={setNodeRef}
      style={{ ...style, ...cardStyle }}
      layout
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.94 }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1],
        layout: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
      }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Buka to-do: ${todo.title}`}
      className={[
        'bg-card rounded-[1.25rem] p-4 flex items-center gap-3 border transition-all cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-todo focus-visible:ring-offset-2',
        isDragOverlay
          ? 'shadow-2xl border-todo/30 ring-1 ring-todo/20'
          : todo.is_done
            ? 'opacity-55 border-border/50'
            : 'border-card-border hover:border-todo/40 hover:shadow-md',
        isDragging ? 'shadow-lg' : '',
      ].join(' ')}
    >
      {/* ── Checkbox ── */}
      <button
        type="button"
        aria-label={
          todo.is_done
            ? `Tandai belum selesai: ${todo.title}`
            : `Tandai selesai: ${todo.title}`
        }
        onClick={onToggle}
        className={[
          'min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-todo focus-visible:ring-offset-2',
          todo.is_done
            ? 'bg-todo border-todo text-white scale-100 shadow-sm'
            : 'border-muted-foreground/25 hover:border-todo bg-background',
        ].join(' ')}
      >
        {todo.is_done ? (
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 18 }}
          >
            <Check size={17} strokeWidth={3.5} />
          </motion.div>
        ) : (
          <div className="w-full h-full rounded-full flex items-center justify-center">
            {isDragOverlay && (
              <motion.div
                className="w-2 h-2 rounded-full bg-todo/40"
                animate={{ scale: [1, 1.5, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
          </div>
        )}
      </button>

      {/* ── Content ── */}
      <div className="flex-1 min-w-0">
        <h3
          className={[
            'font-bold text-sm leading-snug transition-all',
            todo.is_done
              ? 'line-through text-muted-foreground/70'
              : 'text-foreground',
          ].join(' ')}
        >
          {todo.title}
        </h3>

        {todo.description && !todo.is_done && (
          <p className="text-xs font-medium text-muted-foreground/80 mt-1 line-clamp-1 leading-relaxed">
            {todo.description}
          </p>
        )}

        {(todo.due_date || todo.due_time) && !todo.is_done && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {todo.due_date && (
              <span
                className={[
                  'flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border',
                  isOverdue
                    ? 'bg-destructive/10 text-destructive border-destructive/25'
                    : 'bg-todo/10 text-todo-text border-todo/20',
                ].join(' ')}
              >
                <Calendar size={11} strokeWidth={2.5} />
                {format(
                  new Date(
                    todo.due_date.length === 10
                      ? todo.due_date + 'T12:00:00'
                      : todo.due_date,
                  ),
                  'd MMM',
                  { locale: id },
                )}
              </span>
            )}
            {todo.due_time && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-todo/10 text-todo-text border border-todo/20">
                <Clock size={11} strokeWidth={2.5} />
                {todo.due_time}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Drag handle ── */}
      {!disabled && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Ubah urutan: ${todo.title}`}
          className={[
            'min-h-[44px] min-w-[44px] w-10 h-10 flex items-center justify-center rounded-full flex-shrink-0 transition-colors',
            'text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/50',
            'touch-none cursor-grab active:cursor-grabbing',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-todo/40',
            todo.is_done ? 'opacity-30' : '',
          ].join(' ')}
        >
          <GripVertical size={18} strokeWidth={2} />
        </button>
      )}
    </motion.div>
  );
}

/** Drag‑overlay clone — same card without sortable wiring, with a lift effect. */
export function TodoCardOverlay({ todo }: { todo: Todo }) {
  // Fake onToggle that is a no-op for the overlay
  const noop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  return (
    <TodoCard
      todo={todo}
      onClick={() => {}}
      onToggle={noop}
      disabled
      isDragOverlay
    />
  );
}
