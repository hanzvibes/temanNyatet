import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import type { Note } from '@/lib/database.types';

// ── Palette (mirrors SortableNoteGrid so colours are consistent) ──────────────
const PALETTE = [
  'var(--note-card-1)',
  'var(--note-card-2)',
  'var(--note-card-3)',
  'var(--note-card-4)',
];

function colorForNoteId(noteId: string): string {
  let hash = 0;
  for (let i = 0; i < noteId.length; i++) {
    hash = (hash * 31 + noteId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function stickyRotation(noteId: string): number {
  let hash = 0;
  for (let i = 0; i < noteId.length; i++) {
    hash = ~((hash * 31 + noteId.charCodeAt(i)) | 0);
  }
  return ((Math.abs(hash) % 9) - 4) * 0.5;
}

// ── Thresholds ───────────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 400;

// ── Props ────────────────────────────────────────────────────────────────────
interface StickyNoteWallProps {
  notes: Note[];
  onClickNote: (note: Note, color: string) => void;
}

// ── StickyNoteWall ───────────────────────────────────────────────────────────
export function StickyNoteWall({ notes, onClickNote }: StickyNoteWallProps) {
  const [[activeIndex, direction], setActiveIndex] = useState([0, 0]);

  const paginate = useCallback(
    (newDirection: number) => {
      // newDirection: -1 = swipe left (next), +1 = swipe right (prev)
      const next = activeIndex + (newDirection === 1 ? -1 : 1);
      if (next < 0 || next >= notes.length) return;
      setActiveIndex([next, newDirection]);
    },
    [activeIndex, notes.length],
  );

  const handleDragEnd = useCallback(
    (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
      const swipedRight =
        info.offset.x > SWIPE_THRESHOLD ||
        (info.offset.x > 50 && info.velocity.x > SWIPE_VELOCITY);
      const swipedLeft =
        info.offset.x < -SWIPE_THRESHOLD ||
        (info.offset.x < -50 && info.velocity.x < -SWIPE_VELOCITY);

      if (swipedRight) paginate(1);
      else if (swipedLeft) paginate(-1);
    },
    [paginate],
  );

  if (notes.length === 0) return null;

  const current = notes[activeIndex];
  const prevNote = activeIndex > 0 ? notes[activeIndex - 1] : null;
  const nextNote = activeIndex < notes.length - 1 ? notes[activeIndex + 1] : null;

  return (
    <div className="flex flex-col items-center justify-center w-full h-full select-none overflow-hidden">
      {/* ── Card stack ─────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center w-full max-w-sm flex-1 min-h-0 px-4">
        {/* Stack: next card (behind) */}
        {nextNote && (
          <motion.div
            key={`stack-${nextNote.id}`}
            className="absolute w-[92%] h-[94%] rounded-2xl pointer-events-none"
            style={{
              backgroundColor: nextNote.color || colorForNoteId(nextNote.id),
              rotate: `${stickyRotation(nextNote.id)}deg`,
              y: 12,
              scale: 0.92,
              zIndex: 1,
            }}
          >
            {/* subtle outline so it reads as a card layer */}
            <div className="absolute inset-0 rounded-2xl border border-white/10 dark:border-white/5" />
          </motion.div>
        )}

        {/* Stack: prev card (further behind) */}
        {prevNote && (
          <motion.div
            key={`stack-${prevNote.id}`}
            className="absolute w-[86%] h-[88%] rounded-2xl pointer-events-none"
            style={{
              backgroundColor: prevNote.color || colorForNoteId(prevNote.id),
              rotate: `${stickyRotation(prevNote.id)}deg`,
              y: 22,
              scale: 0.85,
              zIndex: 0,
            }}
          >
            <div className="absolute inset-0 rounded-2xl border border-white/5 dark:border-white/[0.02]" />
          </motion.div>
        )}

        {/* Current card — draggable */}
        <AnimatePresence>
          <SwipeCard
            key={current.id}
            note={current}
            color={current.color || colorForNoteId(current.id)}
            rotation={stickyRotation(current.id)}
            direction={direction}
            onDragEnd={handleDragEnd}
            onClick={() => onClickNote(current, current.color || colorForNoteId(current.id))}
          />
        </AnimatePresence>
      </div>

      {/* ── Bottom: dots + counter ─────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-3 pb-4 pt-2">
        {/* Dots */}
        <div className="flex items-center gap-1.5">
          {notes.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex([i, i > activeIndex ? -1 : 1])}
              className={`rounded-full transition-all duration-300 ${
                i === activeIndex
                  ? 'w-6 h-2 bg-foreground'
                  : 'w-2 h-2 bg-muted-foreground/25 hover:bg-muted-foreground/50'
              }`}
              aria-label={`Catatan ke-${i + 1}`}
            />
          ))}
        </div>

        {/* Counter */}
        <div className="text-xs font-semibold text-muted-foreground/60 tracking-wider tabular-nums">
          {activeIndex + 1} / {notes.length}
        </div>
      </div>
    </div>
  );
}

// ── SwipeCard ────────────────────────────────────────────────────────────────
function SwipeCard({
  note,
  color,
  rotation,
  direction,
  onDragEnd,
  onClick,
}: {
  note: Note;
  color: string;
  rotation: number;
  direction: number;
  onDragEnd: (_: any, info: { offset: { x: number }; velocity: { x: number } }) => void;
  onClick: () => void;
}) {
  return (
    <motion.div
      className="absolute inset-0 w-full h-full rounded-2xl cursor-grab active:cursor-grabbing
                 flex flex-col overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]"
      style={{
        backgroundColor: color,
        rotate: `${rotation}deg`,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
      }}
      initial={{
        opacity: 0,
        scale: 0.85,
        y: 40,
        rotate: `${rotation - (direction < 0 ? 8 : -8)}deg`,
      }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        rotate: `${rotation}deg`,
      }}
      exit={{
        opacity: 0,
        x: direction < 0 ? -320 : 320,
        rotate: `${direction < 0 ? -15 : 15}deg`,
        scale: 0.9,
        transition: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
      }}
      transition={{
        type: 'spring',
        stiffness: 280,
        damping: 26,
        mass: 0.8,
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={onDragEnd}
      whileDrag={{
        rotate: `${rotation}deg`,
        scale: 1.02,
        transition: { duration: 0 },
      }}
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={note.title || 'Catatan tanpa judul'}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* ── Card content ──────────────────────────────────────────────── */}
      <div className="p-5 sm:p-6 pt-7 sm:pt-8 flex flex-col flex-1 min-h-0">
        {note.title && (
          <h3
            className="font-bold text-foreground mb-3 leading-tight text-lg sm:text-xl"
            style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', 'Marker Felt', cursive, sans-serif" }}
          >
            {note.title}
          </h3>
        )}

        {/* Content body */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <p
            className="text-sm sm:text-base text-foreground/90 whitespace-pre-wrap leading-relaxed"
            style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', 'Marker Felt', cursive, sans-serif" }}
          >
            {note.content}
          </p>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {note.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="text-[10px] sm:text-xs px-2.5 py-1 rounded-full
                           bg-white/50 dark:bg-black/15 text-muted-foreground font-bold uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 4 && (
              <span className="text-[10px] sm:text-xs px-2 py-1 rounded-full
                               bg-white/50 dark:bg-black/15 text-muted-foreground font-bold">
                +{note.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <div className="mt-auto pt-4 text-xs font-bold text-muted-foreground opacity-70">
          {format(new Date(note.created_at), 'd MMM yyyy', { locale: id })}
        </div>
      </div>
    </motion.div>
  );
}
