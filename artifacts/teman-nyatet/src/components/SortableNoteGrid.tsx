import React, { memo, useCallback, useMemo, useState, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragMoveEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Note } from '@/lib/database.types';
import { DeleteTarget } from './DeleteTarget';

// ─── Palette ──────────────────────────────────────────────────────────────────
// Four soft sticky-note colours. Index-based mapping keeps the surface calm and
// non-distracting; cards get their slot deterministically from their note id so
// the colour is stable across reorder/remount/refetch.
// ─── Palette ──────────────────────────────────────────────────────────────────
// Four soft sticky-note colours. Index-based mapping keeps the surface calm and
// non-distracting; cards get their slot deterministically from their note id so
// the colour is stable across reorder/remount/refetch.
//
// Entries reference CSS variables declared in `:root` / `.dark` so the palette
// flips with the theme. Light values are pale pastels (paper-like against
// cream); dark values are flat dark tints of the same hue (still legible as
// "a card of section X" against the slate canvas, no longer flashlight-bright).
const PALETTE = ['var(--note-card-1)', 'var(--note-card-2)', 'var(--note-card-3)', 'var(--note-card-4)'];

function colorForNoteId(noteId: string): string {
  let hash = 0;
  for (let i = 0; i < noteId.length; i++) {
    // Standard 31-multiplier string hash; cast to int32 keeps it deterministic.
    hash = (hash * 31 + noteId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// ─── Animation tuning ─────────────────────────────────────────────────────────
// A single spring config drives both layout-settle (after drop) and the
// overlay's drop animation. Tuned to:
// - React with no perceptible lag on mid-range mobile devices
// - Settle with a hint of bounce (not overshoot) — feels "physical" like the
//   reference apps (Notion / Linear / Trello)
// - Stay sub-300ms so reordering feels instant
const SORT_SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const;

// Visual lift applied to the dragged overlay clone. Subtle (1.04× / -1.5°) on
// purpose — large values look theatrical; small values read as weight.
const OVERLAY_SCALE = 1.04;
const OVERLAY_ROTATE_DEG = -1.5;

// Pointer activation distance. ≥4px prevents a drag-vs-scroll conflict on
// touch devices while still feeling snappy on desktop pointers.
const POINTER_ACTIVATION_DISTANCE = 5;

// ── Shared card body ─────────────────────────────────────────────────────────
// One render path for "inline" and "in overlay". Eliminates the small visual
// jump that happens when the active card flips between the two at pickup/drop,
// and reduces the markup duplication that previously lived in two places.
function NoteCardBody({
  note,
  handle,
}: {
  note: Note;
  handle: React.ReactNode;
}) {
  return (
    <>
      <div className="flex justify-end mb-1 -mt-1 -mr-1">{handle}</div>
      {note.title && (
        <h3 className="font-bold text-foreground mb-2 leading-tight text-lg">
          {note.title}
        </h3>
      )}
      <p className="text-sm text-foreground/90 line-clamp-5 whitespace-pre-wrap leading-relaxed font-medium">
        {note.content}
      </p>
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-4">
          {note.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2.5 py-1 rounded-full bg-white/60 dark:bg-white/10 text-foreground font-bold uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 2 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-white/60 dark:bg-white/10 text-foreground font-bold">
              +{note.tags.length - 2}
            </span>
          )}
        </div>
      )}
      <div className="mt-4 text-xs text-muted-foreground font-bold">
        {format(new Date(note.created_at), 'd MMM yyyy', { locale: idLocale })}
      </div>
    </>
  );
}

// ── Sortable inline card ─────────────────────────────────────────────────────
// KEY DESIGN RULE: every visual property on this card is controlled by ONE
// system, never two at once.
//
// Why it matters: an earlier version of this component animated opacity via
// framer-motion (animate.opacity) while dnd-kit concurrently drove transform
// via React state. On mobile Chrome those two animation systems could desync
// during the brief render window between dnd-kit's `onDragEnd` clearing
// `activeId` and the next React commit. The dropped card was left at its
// mid-tween opacity (~0.35) until something else re-rendered it. The user saw
// a washed-out card with light-gray text immediately after drop.
//
// Fix: opacity lives in plain CSS (inline `style.opacity + transition`).
// CSS transitions are atomic — the property flips in one paint frame when
// `isDragging` becomes false. There is no JS-driven MotionValue to lose its
// target.
//
// dnd-kit owns `transform` and `transition` (its rectSortingStrategy already
// gives cards a smooth cubic-bezier return-to-zero on drop, so no separate
// layout-prop animation is needed — adding one just reintroduces the same
// race we are avoiding). Framer-motion is retained ONLY for the one-shot
// mount fade-in (`initial`); it never touches the live drag state.
function SortableNoteCard({
  note,
  color,
  onClick,
  disabled,
}: {
  note: Note;
  color: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: note.id, disabled });

  const style: React.CSSProperties = {
    // dnd-kit owns `transform` and `transition` outright. dnd-kit's
    // rectSortingStrategy already applies a smooth cubic-bezier return-to-zero
    // on drop, which is exactly what users expect for a "card settles into
    // its slot" animation. No need for an additional framer-motion `layout`.
    transform: CSS.Translate.toString(transform),
    transition,
    backgroundColor: color,
    // Pure CSS opacity. Flips atomically with isDragging — no JS animation
    // to lose its target mid-tween.
    opacity: isDragging ? 0.4 : 1,
    // Lift on top during re-flow so the empty slot visibly opens beneath.
    zIndex: isDragging ? 50 : undefined,
  };

  const handle = disabled ? null : (
    <button
      type="button"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Ubah urutan catatan: ${note.title || 'tanpa judul'}`}
      // 44×44 minimum tap target on the grip — Apple HIG / WCAG 2.5.5.
      // `touch-none` lets dnd-kit fully claim the gesture (no scroll steal).
      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground/60 hover:text-foreground rounded-full hover:bg-muted touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
    >
      <GripVertical size={20} strokeWidth={2.2} />
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      onKeyDown={(e) => {
        // Keyboard parity with onClick — Enter and Space (the canonical
        // button keys) open the same modal the click opens. Space is included
        // because the WAI-ARIA button role treats Space as equivalent to
        // Enter; without it, keyboard users would need a separate path.
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      // tabIndex={0} promotes the listitem into the tab order so keyboard
      // users can reach it without having to hit every drag handle first.
      tabIndex={0}
      role="listitem"
      aria-label={note.title ? `Catatan: ${note.title}. Tekan Enter untuk membuka.` : 'Catatan tanpa judul. Tekan Enter untuk membuka.'}
      className="rounded-[1.5rem] p-5 shadow-sm hover:shadow-md cursor-pointer relative select-none transition-shadow duration-200 will-change-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <NoteCardBody note={note} handle={handle} />
    </div>
  );
}

// React.memo: re-renders of the grid parent's drag state shouldn't redraw
// every card — only the active and the new-order neighbours actually need to.
const MemoSortableNoteCard = memo(SortableNoteCard);

// ── Drag overlay clone ───────────────────────────────────────────────────────
// This is the cursor-following preview. We give it the same chrome as an
// inline card plus the lift treatment (scale + tilt) so users feel they're
// holding something heavy.
function DragOverlayCard({ note, color }: { note: Note; color: string }) {
  return (
    <div
      className="rounded-[1.5rem] p-5 cursor-grabbing ring-1 ring-black/5"
      style={{
        backgroundColor: color,
        transform: `rotate(${OVERLAY_ROTATE_DEG}deg) scale(${OVERLAY_SCALE})`,
        // Big, soft shadow so the overlay reads "lifted off the surface"
        // without looking like a different component.
        boxShadow:
          '0 24px 48px -12px rgba(0,0,0,0.25), 0 8px 16px -6px rgba(0,0,0,0.12)',
      }}
    >
      <NoteCardBody note={note} handle={null} />
    </div>
  );
}

// ── Delete zone parameters ─────────────────────────────────────────────────────
// The delete target activates when the pointer enters the bottom 150 px of the
// viewport, centred horizontally in a 280 px-wide band — wide enough to feel
// forgiving on mobile, narrow enough to avoid accidental triggers.
const DELETE_ZONE_BOTTOM = 150;
const DELETE_ZONE_HALF_WIDTH = 140; // half of the 280 px band

// ── Sortable grid ──────────────────────────────────────────────────────────────
type SortableNoteGridProps = {
  notes: Note[];
  onReorder: (orderedIds: string[]) => void;
  onClickNote: (note: Note, color: string) => void;
  onDeleteNote?: (noteId: string) => void;
  disabled?: boolean;
};

export function SortableNoteGrid({
  notes,
  onReorder,
  onClickNote,
  onDeleteNote,
  disabled,
}: SortableNoteGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isOverDelete, setIsOverDelete] = useState(false);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);

  // Refs to avoid stale closures inside drag handlers
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const onDeleteNoteRef = useRef(onDeleteNote);
  onDeleteNoteRef.current = onDeleteNote;
  const onClickNoteRef = useRef(onClickNote);
  onClickNoteRef.current = onClickNote;
  const isOverDeleteRef = useRef(false);
  const activeIdRef = useRef<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Stable callbacks so MemoSortableNoteCard's memoization actually skips
  // re-renders. Without these, every keystroke / state update in a parent
  // would re-render every card.
  const itemsKey = useMemo(() => notes.map((n) => n.id).join('|'), [notes]);

  const handleCardClick = useCallback(
    (noteId: string) => {
      const note = notesRef.current.find((n) => n.id === noteId);
      if (!note) return;
      onClickNoteRef.current(note, note.color || colorForNoteId(noteId));
    },
    [],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id);
    setActiveId(id);
    activeIdRef.current = id;
    setIsOverDelete(false);
    isOverDeleteRef.current = false;
    setDeleteConfirmed(false);
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const ev = event.activatorEvent;
    // Only pointer/touch events have meaningful coordinates; keyboard
    // sort operations should not trigger the delete zone.
    if ('clientY' in ev && 'clientX' in ev) {
      const x = (ev as PointerEvent).clientX;
      const y = (ev as PointerEvent).clientY;
      const nearBottom = window.innerHeight - y < DELETE_ZONE_BOTTOM;
      const nearCenter = Math.abs(x - window.innerWidth / 2) < DELETE_ZONE_HALF_WIDTH;
      const isNear = nearBottom && nearCenter;
      setIsOverDelete(isNear);
      isOverDeleteRef.current = isNear;
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const wasOverDelete = isOverDeleteRef.current;
      const draggedId = String(event.active.id);

      if (wasOverDelete && onDeleteNoteRef.current) {
        // Brief confirmation flash before resetting
        setDeleteConfirmed(true);
        setTimeout(() => {
          setActiveId(null);
          setIsOverDelete(false);
          isOverDeleteRef.current = false;
          activeIdRef.current = null;
        }, 280);
        // Fire the delete callback so the exit animation can play
        // while the API call is in-flight.
        setTimeout(() => onDeleteNoteRef.current!(draggedId), 20);
        return;
      }

      setActiveId(null);
      setIsOverDelete(false);
      isOverDeleteRef.current = false;

      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const currentNotes = notesRef.current;
      const oldIndex = currentNotes.findIndex((n) => n.id === active.id);
      const newIndex = currentNotes.findIndex((n) => n.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(currentNotes, oldIndex, newIndex);
      onReorderRef.current(reordered.map((n) => n.id));
    },
    [],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setIsOverDelete(false);
    isOverDeleteRef.current = false;
    activeIdRef.current = null;
    setDeleteConfirmed(false);
  }, []);

  const activeNote = activeId ? notes.find((n) => n.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      // Localised screen-reader announcements. dnd-kit wires these into a
      // hidden live region automatically; no extra markup needed.
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `Mengambil catatan. Gunakan tombol panah untuk memindahkan, Tekan Enter untuk meletakkan, Escape untuk membatalkan.`,
          onDragOver: ({ active, over }) =>
            over && active.id !== over.id
              ? `Berpindah ke posisi baru.`
              : ``,
          onDragEnd: ({ over }) =>
            over ? `Catatan diletakkan di posisi baru.` : `Pengurutan dibatalkan.`,
          onDragCancel: () => `Pengurutan dibatalkan. Catatan dikembalikan ke posisi semula.`,
        },
        screenReaderInstructions: {
          draggable:
            'Untuk memindahkan catatan, tekan tombol grip. Saat terfokus, tekan Space atau Enter untuk mengambil, gunakan tombol panah untuk berpindah posisi, tekan Space atau Enter lagi untuk meletakkan, atau tekan Escape untuk membatalkan.',
        },
      }}
    >
      <SortableContext
        items={notes.map((n) => n.id)}
        strategy={rectSortingStrategy}
        disabled={disabled}
      >
        <div
          role="list"
          aria-label="Daftar catatan. Tekan tombol grip pada kartu untuk mengubah urutan."
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start"
          data-notes-version={itemsKey}
        >
          <AnimatePresence>
            {notes.map((note) => (
              <motion.div
                key={note.id}
                exit={{ opacity: 0, scale: 0.45, y: 40 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
                className="contents"
              >
                <MemoSortableNoteCard
                  note={note}
                  color={note.color || colorForNoteId(note.id)}
                  onClick={() => handleCardClick(note.id)}
                  disabled={disabled}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </SortableContext>

      <DragOverlay>
        {activeNote ? (
          <DragOverlayCard note={activeNote} color={activeNote.color || colorForNoteId(activeNote.id)} />
        ) : null}
      </DragOverlay>

      <DeleteTarget
        isDragging={activeId !== null || deleteConfirmed}
        isOverDelete={isOverDelete}
        deleteConfirmed={deleteConfirmed}
      />
    </DndContext>
  );
}
