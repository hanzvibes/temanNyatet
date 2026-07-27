import { useRef, useCallback, type ReactNode } from 'react';
import { motion } from 'framer-motion';
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
  // Return a value in degrees between -2 and +2 with 0.5 increments
  return ((Math.abs(hash) % 9) - 4) * 0.5;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface StickyNoteWallProps {
  notes: Note[];
  onClickNote: (note: Note, color: string) => void;
}

// ── StickyNoteWall ───────────────────────────────────────────────────────────
export function StickyNoteWall({ notes, onClickNote }: StickyNoteWallProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDown = useRef(false);
  const startX = useRef(0);
  const scrollPos = useRef(0);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    isDown.current = true;
    startX.current = e.clientX;
    scrollPos.current = scrollRef.current?.scrollLeft ?? 0;
    if (e.currentTarget instanceof Element) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDown.current) return;
    e.preventDefault();
    const dx = e.clientX - startX.current;
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollPos.current - dx;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    isDown.current = false;
  }, []);

  if (notes.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto overflow-y-hidden overscroll-x-none scroll-smooth cursor-grab active:cursor-grabbing select-none
                 -mx-5 sm:-mx-6 lg:-mx-10 px-5 sm:px-6 lg:px-10 pt-4 pb-6"
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="flex gap-6 lg:gap-8 items-stretch" style={{ minHeight: 260 }}>
        {notes.map((note, i) => {
          const color = note.color || colorForNoteId(note.id);
          const rot = stickyRotation(note.id);

          return (
            <StickyNoteCard
              key={note.id}
              note={note}
              color={color}
              rotation={rot}
              index={i}
              onClick={() => onClickNote(note, color)}
            />
          );
        })}
      </div>
    </div>
  );
}

// ── Individual sticky note card ──────────────────────────────────────────────
function StickyNoteCard({
  note,
  color,
  rotation,
  index,
  onClick,
}: {
  note: Note;
  color: string;
  rotation: number;
  index: number;
  onClick: () => void;
}) {
  return (
    <motion.div
      className="shrink-0 w-[240px] sm:w-[270px] lg:w-[290px] rounded-none relative
                 before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:-translate-y-[5px]
                 before:w-9 before:h-[10px] before:rounded-b-sm before:bg-white/65 dark:before:bg-white/10
                 before:shadow-[0_1px_2px_rgba(0,0,0,0.04)]
                 before:pointer-events-none before:z-10"
      style={{
        backgroundColor: color,
        rotate: `${rotation}deg`,
        boxShadow: `
          0 1px 3px rgba(0,0,0,0.04),
          0 3px 10px rgba(0,0,0,0.06),
          0 8px 24px rgba(0,0,0,0.04),
          ${rotation < 0
            ? `-${Math.abs(rotation) * 2}px 6px 20px rgba(0,0,0,0.06)`
            : `${rotation * 2}px 6px 20px rgba(0,0,0,0.06)`}
        `,
        borderRadius: 0,
      }}
      initial={{ opacity: 0, y: 24, scale: 0.92, rotate: rotation * 2 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: rotation }}
      transition={{
        delay: Math.min(index * 0.035, 0.5),
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1],
      }}
      whileHover={{ scale: 1.02, rotate: `${rotation}deg` }}
      whileTap={{ scale: 0.97 }}
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
      {/* Content */}
      <div className="p-5 pt-7">
        {note.title && (
          <h3
            className="font-bold text-foreground mb-2 leading-tight text-base"
            style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', 'Marker Felt', cursive, sans-serif" }}
          >
            {note.title}
          </h3>
        )}
        <p
          className="text-sm text-foreground/90 line-clamp-5 whitespace-pre-wrap leading-relaxed"
          style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', 'Marker Felt', cursive, sans-serif" }}
        >
          {note.content}
        </p>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {note.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2.5 py-1 rounded-full bg-white/50 dark:bg-black/15 text-muted-foreground font-bold uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-white/50 dark:bg-black/15 text-muted-foreground font-bold">
                +{note.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <div className="mt-4 text-[10px] text-muted-foreground font-bold opacity-70">
          {format(new Date(note.created_at), 'd MMM yyyy', { locale: id })}
        </div>
      </div>
    </motion.div>
  );
}
