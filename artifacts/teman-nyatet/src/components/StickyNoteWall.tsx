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
    <div className="w-full h-full flex flex-col min-h-0">
      <div
        className="overflow-x-auto overflow-y-hidden overscroll-x-none select-none
                   flex items-stretch flex-1 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--border) transparent',
          WebkitOverflowScrolling: 'touch',
          contain: 'layout style paint',
        }}
      >
        {/* Left spacer — centers cards when they fit */}
        <div className="flex-1 min-w-0" />

        {/* Cards */}
        <div className="flex gap-4 sm:gap-6 lg:gap-8 shrink-0 items-stretch h-full min-h-[200px]">
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

        {/* Right spacer — mirrors left for perfect centering */}
        <div className="flex-1 min-w-0" />
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
      className="shrink-0 w-[180px] xs:w-[220px] sm:w-[250px] lg:w-[280px]
                 h-full rounded-none relative
                 cursor-pointer transition-transform duration-150 ease-out
                 active:scale-[0.97] hover:scale-[1.02] flex flex-col
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
      {/* Content — flex column fills the card height completely */}
      <div className="p-4 pt-7 sm:p-5 sm:pt-7 flex flex-col flex-1 min-h-0">
        {note.title && (
          <h3
            className="font-bold text-foreground mb-2 leading-tight text-sm sm:text-base"
            style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', 'Marker Felt', cursive, sans-serif" }}
          >
            {note.title}
          </h3>
        )}

        {/* Content body — pushes tags/date down when short, scrolls when long */}
        <div className="flex-1 min-h-0">
          <p
            className="text-xs sm:text-sm text-foreground/90 line-clamp-4 sm:line-clamp-5
                       whitespace-pre-wrap leading-relaxed"
            style={{ fontFamily: "'Segoe Print', 'Comic Sans MS', 'Marker Felt', cursive, sans-serif" }}
          >
            {note.content}
          </p>
        </div>

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3 sm:mt-4">
            {note.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[9px] sm:text-[10px] px-2 py-1 sm:px-2.5 sm:py-1 rounded-full
                           bg-white/50 dark:bg-black/15 text-muted-foreground font-bold uppercase tracking-wider"
              >
                {tag}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-[9px] sm:text-[10px] px-2 py-1 rounded-full
                               bg-white/50 dark:bg-black/15 text-muted-foreground font-bold">
                +{note.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Date — always at the bottom */}
        <div className="mt-auto pt-3 text-[9px] sm:text-[10px] text-muted-foreground font-bold opacity-70">
          {format(new Date(note.created_at), 'd MMM yyyy', { locale: id })}
        </div>
      </div>
    </div>
  );
}
