import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
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
import { GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import type { Note } from '@/lib/database.types';

// ─── Palette ──────────────────────────────────────────────────────────────────
// Four soft sticky-note colours. Index-based mapping keeps the surface calm and
// non-distracting; cards get their slot deterministically from their note id so
// the colour is stable across reorder/remount/refetch.
const PALETTE = ['#FFF8D6', '#E8F2DF', '#FFE4E1', '#E1F0FF'];

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
        <h3 className="font-bold text-gray-900 mb-2 leading-tight text-lg">
          {note.title}
        </h3>
      )}
      <p className="text-sm text-gray-800 line-clamp-5 whitespace-pre-wrap leading-relaxed font-medium">
        {note.content}
      </p>
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-4">
          {note.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2.5 py-1 rounded-full bg-white/60 text-gray-800 font-bold uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 2 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-white/60 text-gray-800 font-bold">
              +{note.tags.length - 2}
            </span>
          )}
        </div>
      )}
      <div className="mt-4 text-xs text-gray-600/80 font-bold">
        {format(new Date(note.created_at), 'd MMM yyyy', { locale: idLocale })}
      </div>
    </>
  );
}

// ── Sortable inline card ─────────────────────────────────────────────────────
// Important: dnd-kit owns `transform` while dragging. Framer-motion therefore
// MUST NOT animate scale/y here — that would conflict with the inline `style`
// transform and cause visible jitter during drag. Framer-motion only animates
// opacity (the dim) and runs the `layout` settle once the drag ends.
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
    // dnd-kit runs the transform during drag; framer-motion does not write
    // transform here, so there is no fight.
    transform: CSS.Translate.toString(transform),
    transition,
    backgroundColor: color,
    // zIndex lift is the canonical pattern to keep the dragged card on top
    // during grid re-flow.
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
      className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500/60 hover:text-gray-800 rounded-full hover:bg-black/5 touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 transition-colors"
    >
      <GripVertical size={20} strokeWidth={2.2} />
    </button>
  );

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      // Disable framer-motion's layout engine during active drag — otherwise it
      // tries to drive transforms while dnd-kit does, producing jumps.
      layout={!isDragging}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: isDragging ? 0.35 : 1 }}
      transition={{
        opacity: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
        layout: SORT_SPRING,
      }}
      onClick={onClick}
      role="listitem"
      aria-label={note.title ? `Catatan: ${note.title}` : 'Catatan tanpa judul'}
      className="rounded-[1.5rem] p-5 shadow-sm hover:shadow-md cursor-pointer relative select-none"
    >
      <NoteCardBody note={note} handle={handle} />
    </motion.div>
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

// ── Sortable grid ──────────────────────────────────────────────────────────────
type SortableNoteGridProps = {
  notes: Note[];
  onReorder: (orderedIds: string[]) => void;
  onClickNote: (note: Note, color: string) => void;
  disabled?: boolean;
};

export function SortableNoteGrid({
  notes,
  onReorder,
  onClickNote,
  disabled,
}: SortableNoteGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

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
      const note = notes.find((n) => n.id === noteId);
      if (!note) return;
      onClickNote(note, colorForNoteId(noteId));
    },
    [notes, onClickNote],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = notes.findIndex((n) => n.id === active.id);
      const newIndex = notes.findIndex((n) => n.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const reordered = arrayMove(notes, oldIndex, newIndex);
      onReorder(reordered.map((n) => n.id));
    },
    [notes, onReorder],
  );

  const handleDragCancel = useCallback(() => setActiveId(null), []);

  const activeNote = activeId ? notes.find((n) => n.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
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
          {notes.map((note) => (
            <MemoSortableNoteCard
              key={note.id}
              note={note}
              color={colorForNoteId(note.id)}
              onClick={() => handleCardClick(note.id)}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeNote ? (
          <DragOverlayCard note={activeNote} color={colorForNoteId(activeNote.id)} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
