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

interface TodoCardProps {
  todo: Todo;
  onClick: () => void;
  onToggle: (e: React.MouseEvent) => void;
  disabled?: boolean;
  isDragOverlay?: boolean;
}

export function TodoCard({
  todo,
  onClick,
  onToggle,
  disabled,
  isDragOverlay,
}: TodoCardProps) {
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
  } = useSortable({ id: todo.id, disabled, animateLayoutChanges });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    position: 'relative',
    zIndex: isDragging ? 50 : undefined,
  };

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{
        duration: 0.22,
        ease: [0.25, 0.1, 0.25, 1],
        layout: { duration: 0.2, ease: [0.25, 0.1, 0.25, 1] },
      }}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`Buka to-do: ${todo.title}`}
      className={[
        'flex cursor-pointer select-none items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-todo focus-visible:ring-offset-2',
        isDragOverlay
          ? 'border-todo/30 shadow-elevation-3 ring-1 ring-todo/15'
          : todo.is_done
            ? 'border-border/40 opacity-50'
            : 'border-border/55 hover:border-todo/35 hover:shadow-elevation-1',
        isDragging ? 'shadow-elevation-2' : '',
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
          'flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full border-2 transition-all duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-todo focus-visible:ring-offset-2',
          todo.is_done
            ? 'border-todo bg-todo text-white shadow-sm'
            : 'border-muted-foreground/20 bg-background hover:border-todo',
        ].join(' ')}
      >
        {todo.is_done ? (
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
          >
            <Check size={15} strokeWidth={3} />
          </motion.div>
        ) : isDragOverlay ? (
          <motion.div
            className="h-1.5 w-1.5 rounded-full bg-todo/40"
            animate={{ scale: [1, 1.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
        ) : null}
      </button>

      {/* ── Content ── */}
      <div className="min-w-0 flex-1">
        <p
          className={[
            'text-sm font-semibold leading-snug transition-all',
            todo.is_done ? 'text-muted-foreground/60 line-through' : 'text-foreground',
          ].join(' ')}
        >
          {todo.title}
        </p>

        {todo.description && !todo.is_done && (
          <p className="mt-0.5 line-clamp-1 text-xs font-medium leading-relaxed text-muted-foreground/70">
            {todo.description}
          </p>
        )}

        {(todo.due_date || todo.due_time) && !todo.is_done && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {todo.due_date && (
              <span
                className={[
                  'flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                  isOverdue
                    ? 'border-destructive/20 bg-destructive/8 text-destructive'
                    : 'border-todo/20 bg-todo/8 text-todo-text',
                ].join(' ')}
              >
                <Calendar size={10} strokeWidth={2.5} />
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
              <span className="flex items-center gap-1 rounded-md border border-todo/20 bg-todo/8 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-todo-text">
                <Clock size={10} strokeWidth={2.5} />
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
            'flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 cursor-grab items-center justify-center rounded-full transition-colors active:cursor-grabbing touch-none',
            'text-muted-foreground/25 hover:bg-muted/50 hover:text-muted-foreground/60',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-todo/40',
            todo.is_done ? 'opacity-30' : '',
          ].join(' ')}
        >
          <GripVertical size={16} strokeWidth={2} />
        </button>
      )}
    </motion.div>
  );
}

/** Drag-overlay clone — same card without sortable wiring, with a lift effect. */
export function TodoCardOverlay({ todo }: { todo: Todo }) {
  const noop = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  return (
    <TodoCard todo={todo} onClick={() => {}} onToggle={noop} disabled isDragOverlay />
  );
}
