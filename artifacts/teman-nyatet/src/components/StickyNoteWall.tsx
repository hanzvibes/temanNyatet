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

// ── Props ────────────────────────────────────────────────────────────────────
interface StickyNoteWallProps {
  notes: Note[];
  onClickNote: (note: Note, color: string) => void;
}

// ── StickyNoteWall ───────────────────────────────────────────────────────────
export function StickyNoteWall({ notes, onClickNote }: StickyNoteWallProps) {
  if (notes.length === 0) return null;

  return (
    <div
      className="overflow-x-auto overflow-y-hidden overscroll-x-none select-none
                 -mx-5 sm:-mx-6 lg:-mx-10 px-5 sm:px-6 lg:px-10 pt-4 pb-6"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--border) transparent',
        WebkitOverflowScrolling: 'touch',
        contain: 'layout style paint',
      }}
    >
      <div className="flex gap-6 lg:gap-8 items-stretch" style={{ minHeight: 260 }}>
        {notes.map((note) => {
          const color = note.color || colorForNoteId(note.id);
          const rot = stickyRotation(note.id);

          return (
            <StickyNoteCard
              key={note.id}
              note={note}
              color={color}
              rotation={rot}
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
  onClick,
}: {
  note: Note;
  color: string;
  rotation: number;
  onClick: () => void;
}) {
  return (
    <div
      className="shrink-0 w-[240px] sm:w-[270px] lg:w-[290px] rounded-none relative
                 cursor-pointer transition-transform duration-150 ease-out
                 active:scale-[0.97] hover:scale-[1.02]
                 before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:-translate-y-[5px]
                 before:w-9 before:h-[10px] before:rounded-b-sm before:bg-white/65 dark:before:bg-white/10
                 before:shadow-[0_1px_2px_rgba(0,0,0,0.04)]
                 before:pointer-events-none before:z-10"
      style={{
        backgroundColor: color,
        rotate: `${rotation}deg`,
        boxShadow:
          rotation < 0
            ? `${rotation * 2 - 1}px 4px 12px rgba(0,0,0,0.08)`
            : `${rotation * 2 + 1}px 4px 12px rgba(0,0,0,0.08)`,
        borderRadius: 0,
        willChange: 'transform',
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
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
    </div>
  );
}
