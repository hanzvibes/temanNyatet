import React, { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  type CollisionDetection,
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
import { id as idLocale } from 'date-fns/locale';
import type { Note } from '@/lib/database.types';
import { getNoteColor, NOTE_COLOR_PALETTE } from '@/lib/noteColors';
import { DeleteTarget } from './DeleteTarget';
import { formatNoteDate } from '@/lib/noteData';

// ─── Palette ──────────────────────────────────────────────────────────────────
const PALETTE = NOTE_COLOR_PALETTE;

function colorForNoteId(noteId: string): string {
  let hash = 0;
  for (let i = 0; i < noteId.length; i++) {
    hash = (hash * 31 + noteId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// ─── Animation tuning ─────────────────────────────────────────────────────────
const SORT_SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const;
const OVERLAY_SCALE = 1.04;
const OVERLAY_ROTATE_DEG = -1.5;
const POINTER_ACTIVATION_DISTANCE = 5;

// ── Collision detection ────────────────────────────────────────────────────────
// When the pointer is inside the delete‑zone droppable, return only that
// collision so the drop registers as a delete gesture. Otherwise fall back
// to closestCenter for normal sortable re‑ordering.
const customCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const deleteZoneCollision = pointerCollisions.find(
    (c) => c.id === 'delete-zone',
  );
  if (deleteZoneCollision) return [deleteZoneCollision];
  return closestCenter(args);
};

// ── Invisible droppable that makes the bottom area a delete target ─────────────
// Rendered as a sibling of SortableContext so dnd-kit detects it during drag.
// The `isOver` state is synced to the parent via onIsOverChange for visual
// feedback in the DeleteTarget component.
const DELETE_ZONE_W = 500;
const DELETE_ZONE_H = 170;

function DeleteDroppable({
  activeId,
  onIsOverChange,
}: {
  activeId: string | null;
  onIsOverChange: (over: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: 'delete-zone' });

  // Stable callback ref so the useEffect doesn't re‑run on every render.
  const onIsOverChangeRef = useRef(onIsOverChange);
  onIsOverChangeRef.current = onIsOverChange;

  useEffect(() => {
    // Only report isOver while a drag is active — we never want stale
    // hover state when the user isn't dragging anything.
    if (activeId) {
      onIsOverChangeRef.current(isOver);
    }
  }, [isOver, activeId]);

  return (
    <div
      ref={setNodeRef}
      className="fixed left-1/2 z-[199]"
      style={{
        bottom: '9rem',
        width: DELETE_ZONE_W,
        height: DELETE_ZONE_H,
        transform: 'translateX(-50%)',
        // Invisible — never block the visual delete pill or any other UI.
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Shared card body ─────────────────────────────────────────────────────────
function NoteCardBody({
  note,
  handle,
}: {
  note: Note;
  handle: React.ReactNode;
}) {
  return (
    <>
      {handle && (
        <div className="absolute right-2 top-2 z-10">
          {handle}
        </div>
      )}
      {note.title && (
        <h3 className="pr-9 font-bold mb-2 leading-tight text-lg">
          {note.title}
        </h3>
      )}
      <p className="text-sm text-current/90 line-clamp-5 whitespace-pre-wrap leading-relaxed font-medium">
        {note.content}
      </p>
      {note.tags && note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-4">
          {note.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[10px] px-2.5 py-1 rounded-full bg-white/55 dark:bg-black/15 text-current font-bold uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
          {note.tags.length > 2 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-white/55 dark:bg-black/15 text-current font-bold">
              +{note.tags.length - 2}
            </span>
          )}
        </div>
      )}
      <div className="mt-4 text-xs text-current/65 font-bold">
        {formatNoteDate(note.created_at, 'd MMM yyyy', idLocale)}
      </div>
    </>
  );
}

// ── Sortable inline card ─────────────────────────────────────────────────────
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
    transform: CSS.Translate.toString(transform),
    transition,
    backgroundColor: color,
    color: getNoteColor(color).foreground,
    borderColor: getNoteColor(color).border,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  const handle = disabled ? null : (
    <button
      type="button"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Ubah urutan catatan: ${note.title || 'tanpa judul'}`}
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
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
      role="listitem"
      aria-label={note.title ? `Catatan: ${note.title}. Tekan Enter untuk membuka.` : 'Catatan tanpa judul. Tekan Enter untuk membuka.'}
      className="rounded-[1.5rem] border p-5 shadow-sm hover:shadow-md cursor-pointer relative select-none transition-shadow duration-200 will-change-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <NoteCardBody note={note} handle={handle} />
    </div>
  );
}

const MemoSortableNoteCard = memo(SortableNoteCard);

// ── Drag overlay clone ───────────────────────────────────────────────────────
function DragOverlayCard({ note, color }: { note: Note; color: string }) {
  return (
    <div
      className="w-[min(80vw,22rem)] rounded-[1.5rem] border p-5 cursor-grabbing"
      style={{
        backgroundColor: color,
        color: getNoteColor(color).foreground,
        borderColor: getNoteColor(color).border,
        transform: `rotate(${OVERLAY_ROTATE_DEG}deg) scale(${OVERLAY_SCALE})`,
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
  const [pendingDeleteNote, setPendingDeleteNote] = useState<Note | null>(null);

  // Refs to avoid stale closures inside drag handlers
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const onDeleteNoteRef = useRef(onDeleteNote);
  onDeleteNoteRef.current = onDeleteNote;
  const onClickNoteRef = useRef(onClickNote);
  onClickNoteRef.current = onClickNote;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: POINTER_ACTIVATION_DISTANCE },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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
    setIsOverDelete(false);
    setDeleteConfirmed(false);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedId = String(event.active.id);

      // ── Delete-on-drop via useDroppable ────────────────────────────────
      if (event.over?.id === 'delete-zone' && onDeleteNoteRef.current) {
        // Preserve the note data so the DragOverlay can keep rendering
        // during the 700ms delete animation even after optimistic removal.
        const noteData = notesRef.current.find(n => n.id === draggedId);
        if (noteData) setPendingDeleteNote(noteData);

        setDeleteConfirmed(true);
        // 700ms: slam (300ms) + check (200ms) + vanish (200ms)
        setTimeout(() => {
          setActiveId(null);
          setIsOverDelete(false);
          setDeleteConfirmed(false);
          setPendingDeleteNote(null);
        }, 700);
        // Fire optimistic removal quickly so the card exit animation
        // plays alongside the trash-animation.
        setTimeout(() => onDeleteNoteRef.current!(draggedId), 20);
        return;
      }

      // ── Normal reorder ─────────────────────────────────────────────────
      setActiveId(null);
      setIsOverDelete(false);

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
    setDeleteConfirmed(false);
  }, []);

  // Fall back to pendingDeleteNote while the delete animation plays,
  // because the note is optimistically removed from `notes` almost immediately.
  const activeNote = activeId
    ? (notes.find((n) => n.id === activeId) || pendingDeleteNote)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) =>
            `Mengambil catatan. Gunakan tombol panah untuk memindahkan, Tekan Enter untuk meletakkan, Escape untuk membatalkan.`,
          onDragOver: ({ active, over }) =>
            over && active.id !== over.id ? `Berpindah ke posisi baru.` : ``,
          onDragEnd: ({ over }) =>
            over
              ? `Catatan diletakkan di posisi baru.`
              : `Pengurutan dibatalkan.`,
          onDragCancel: () =>
            `Pengurutan dibatalkan. Catatan dikembalikan ke posisi semula.`,
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
          className="grid grid-cols-1 gap-4 items-start sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
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

      {/* Disable dnd-kit's default drop animation. It animates the dragged
          card back to its original grid position before unmounting, which is
          especially noticeable when the card is dropped on the delete target. */}
      <DragOverlay dropAnimation={null}>
        {activeNote ? (
          <motion.div
            animate={
              deleteConfirmed
                ? { opacity: 0, scale: 0.35, y: 30 }
                : { opacity: 1, scale: 1, y: 0 }
            }
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
          >
            <DragOverlayCard note={activeNote} color={activeNote.color || colorForNoteId(activeNote.id)} />
          </motion.div>
        ) : null}
      </DragOverlay>

      {/* Invisible droppable that makes the bottom area a delete target */}
      <DeleteDroppable
        activeId={activeId}
        onIsOverChange={setIsOverDelete}
      />

      {/* Visual delete pill */}
      <DeleteTarget
        isDragging={activeId !== null || deleteConfirmed}
        isOverDelete={isOverDelete}
        deleteConfirmed={deleteConfirmed}
      />
    </DndContext>
  );
}
