import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
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
import { id } from 'date-fns/locale';
import type { Note } from '@/lib/database.types';

const PALETTE = ['#FFF8D6', '#E8F2DF', '#FFE4E1', '#E1F0FF'];

// Deterministic, position-independent colour for a note id. Tying the colour
// to the id means it never changes when the list is reordered or refetched,
// so drag-and-drop only moves cards without repainting them.
function colorForNoteId(noteId: string): string {
  let hash = 0;
  for (let i = 0; i < noteId.length; i++) {
    hash = ((hash << 5) - hash + noteId.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function useStableNoteColors(_notes: Note[]) {
  return React.useCallback((noteId: string) => colorForNoteId(noteId), []);
}

type SortableNoteGridProps = {
  notes: Note[];
  onReorder: (orderedIds: string[]) => void;
  onClickNote: (note: Note, color: string) => void;
  disabled?: boolean;
};

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: note.id, disabled });

  const dndStyle = {
    transform: CSS.Translate.toString(transform),
    transition: transition ?? 'transform 220ms cubic-bezier(0.25, 0.1, 0.25, 1)',
    opacity: isDragging ? 0.35 : undefined,
    zIndex: isDragging ? 50 : undefined,
  };

  const handle = disabled ? null : (
    <button
      type="button"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
      className="text-gray-500/60 hover:text-gray-800 p-1.5 rounded-full hover:bg-black/5 touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400/50"
      aria-label="Ubah urutan catatan"
    >
      <GripVertical size={18} strokeWidth={2.5} />
    </button>
  );

  return (
    <motion.div
      ref={setNodeRef}
      layout
      style={{ ...dndStyle, backgroundColor: color }}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.25,
        ease: [0.25, 0.1, 0.25, 1],
        layout: { duration: 0.22, ease: [0.25, 0.1, 0.25, 1] },
      }}
      onClick={onClick}
      className="rounded-[1.5rem] p-5 shadow-sm cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] relative select-none"
    >
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
        {format(new Date(note.created_at), 'd MMM yyyy', { locale: id })}
      </div>
    </motion.div>
  );
}

export function SortableNoteGrid({
  notes,
  onReorder,
  onClickNote,
  disabled,
}: SortableNoteGridProps) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const getColor = useStableNoteColors(notes);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (over && active.id !== over.id) {
      const oldIndex = notes.findIndex((n) => n.id === active.id);
      const newIndex = notes.findIndex((n) => n.id === over.id);
      const reordered = arrayMove(notes, oldIndex, newIndex);
      onReorder(reordered.map((n) => n.id));
    }
  };

  const activeNote = activeId ? notes.find((n) => n.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(e) => setActiveId(String(e.active.id))}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext
        items={notes.map((n) => n.id)}
        strategy={rectSortingStrategy}
        disabled={disabled}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {notes.map((note) => (
            <SortableNoteCard
              key={note.id}
              note={note}
              color={getColor(note.id)}
              onClick={() => onClickNote(note, getColor(note.id))}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeNote ? (
          <div className="rounded-[1.5rem] shadow-2xl scale-[1.03] rotate-1 opacity-95 cursor-grabbing">
            <div
              className="rounded-[1.5rem] p-5 shadow-sm h-full"
              style={{ backgroundColor: getColor(activeNote.id) }}
            >
              {activeNote.title && (
                <h3 className="font-bold text-gray-900 mb-2 leading-tight text-lg">
                  {activeNote.title}
                </h3>
              )}
              <p className="text-sm text-gray-800 line-clamp-5 whitespace-pre-wrap leading-relaxed font-medium">
                {activeNote.content}
              </p>
              {activeNote.tags && activeNote.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-4">
                  {activeNote.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-white/60 text-gray-800 font-bold uppercase tracking-wider"
                    >
                      {tag}
                    </span>
                  ))}
                  {activeNote.tags.length > 2 && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-white/60 text-gray-800 font-bold">
                      +{activeNote.tags.length - 2}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-4 text-xs text-gray-600/80 font-bold">
                {format(new Date(activeNote.created_at), 'd MMM yyyy', { locale: id })}
              </div>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
