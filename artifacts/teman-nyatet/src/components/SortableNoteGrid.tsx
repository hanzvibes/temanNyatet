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
const PALETTE = ['var(--note-card-1)', 'var(--note-card-2)', 'var(--note-card-3)', 'var(--note-card-4)'];

function colorForNoteId(noteId: string): string {
  let hash = 0;
  for (let i = 0; i < noteId.length; i++) {
    hash = (hash * 31 + noteId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

// ─── Animation tuning ─────────────────────────────────────────────────────────
const OVERLAY_SCALE = 1.04;
const OVERLAY_ROTATE_DEG = -1.5;
const POINTER_ACTIVATION_DISTANCE = 5;

// ── Delete zone ────────────────────────────────────────────────────────────────
// The delete target appears ABOVE where the user started dragging (not fixed at
// the bottom of the screen). This prevents accidental deletion of notes near the
// page bottom — the user must deliberately drag the note UPWARD to reach the zone.
const ZONE_ABOVE_DRAG_START = 180; // px above drag-start Y
const ZONE_HALF = 55; // 110×110 px hit area

function getPointerPosition(
  ev: Event | PointerEvent | MouseEvent | TouchEvent | KeyboardEvent,
): { x: number; y: number } | null {
  if ('changedTouches' in ev && (ev as TouchEvent).changedTouches.length > 0) {
    return {
      x: (ev as TouchEvent).changedTouches[0].clientX,
      y: (ev as TouchEvent).changedTouches[0].clientY,
    };
  }
  if ('clientX' in ev && typeof (ev as MouseEvent).clientX === 'number') {
    return { x: (ev as MouseEvent).clientX, y: (ev as MouseEvent).clientY };
  }
  return null;
}

function calcZoneCenter(startX: number, startY: number, vw: number, vh: number) {
  const zoneX = startX;
  const zoneY = Math.max(startY - ZONE_ABOVE_DRAG_START, 60);
  return { x: zoneX, y: zoneY };
}

function isCursorInZone(
  cx: number,
  cy: number,
  zoneX: number,
  zoneY: number,
): boolean {
  return (
    Math.abs(cx - zoneX) < ZONE_HALF &&
    Math.abs(cy - zoneY) < ZONE_HALF
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
      className="rounded-[1.5rem] p-5 shadow-sm hover:shadow-md cursor-pointer relative select-none transition-shadow duration-200 will-change-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
      className="rounded-[1.5rem] p-5 cursor-grabbing ring-1 ring-black/5"
      style={{
        backgroundColor: color,
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
  const [zonePos, setZonePos] = useState<{ x: number; y: number } | null>(null);

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

    // Record drag start position; the delete zone will appear above this point.
    const pos = getPointerPosition(event.activatorEvent);
    if (pos) {
      setZonePos(
        calcZoneCenter(pos.x, pos.y, window.innerWidth, window.innerHeight),
      );
    }
  }, []);

  const handleDragMove = useCallback((event: DragMoveEvent) => {
    const pos = getPointerPosition(event.activatorEvent);
    if (!pos || !zonePosRef.current) return;
    setIsOverDelete(isCursorInZone(pos.x, pos.y, zonePosRef.current.x, zonePosRef.current.y));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const draggedId = String(event.active.id);

      // ── Delete detection (coordinate-based) ──────────────────────────
      // Check whether the pointer is inside the floating delete zone.
      // Zone position is set once on drag start and stays fixed.
      const finalPos = getPointerPosition(event.activatorEvent);
      const zone = zonePosRef.current;
      const shouldDelete =
        finalPos &&
        zone &&
        isCursorInZone(finalPos.x, finalPos.y, zone.x, zone.y) &&
        onDeleteNoteRef.current;

      if (shouldDelete) {
        const noteData = notesRef.current.find(n => n.id === draggedId);
        if (noteData) setPendingDeleteNote(noteData);

        setDeleteConfirmed(true);
        setTimeout(() => {
          setActiveId(null);
          setIsOverDelete(false);
          setDeleteConfirmed(false);
          setPendingDeleteNote(null);
          setZonePos(null);
        }, 700);
        setTimeout(() => onDeleteNoteRef.current!(draggedId), 20);
        return;
      }

      // ── Normal reorder ──────────────────────────────────────────────
      setActiveId(null);
      setIsOverDelete(false);
      setZonePos(null);

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
    setZonePos(null);
  }, []);

  // Refs that stay in sync with state for use inside stable callbacks.
  const zonePosRef = useRef(zonePos);
  zonePosRef.current = zonePos;

  // Fall back to pendingDeleteNote while the delete animation plays.
  const activeNote = activeId
    ? (notes.find((n) => n.id === activeId) || pendingDeleteNote)
    : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
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

      {/* Floating trash target — positioned ABOVE the drag start */}
      <DeleteTarget
        isDragging={activeId !== null || deleteConfirmed}
        isOverDelete={isOverDelete}
        deleteConfirmed={deleteConfirmed}
        zonePos={zonePos}
      />
    </DndContext>
  );
}
