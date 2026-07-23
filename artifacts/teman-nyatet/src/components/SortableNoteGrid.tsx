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

type SortableNoteGridProps = {
  notes: Note[];
  onReorder: (orderedIds: string[]) => void;
  onClickNote: (note: Note, color: string) => void;
  disabled?: boolean;
};

function NoteCardContent({
  note,
  color,
  dragHandle,
}: {
  note: Note;
  color: string;
  dragHandle?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[1.5rem] p-5 shadow-sm h-full"
      style={{ backgroundColor: color }}
    >
      <div className="flex justify-end mb-1 -mt-1 -mr-1">{dragHandle}</div>
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
    </div>
  );
}

function SortableNoteCard({
  note,
  index,
  color,
  onClick,
  disabled,
}: {
  note: Note;
  index: number;
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
    transition,
    opacity: isDragging ? 0.5 : undefined,
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
      style={{ ...dndStyle, backgroundColor: color }}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.25,
        delay: Math.min(index * 0.03, 0.3),
        ease: [0.25, 0.1, 0.25, 1],
      }}
      onClick={onClick}
      className="rounded-[1.5rem] p-5 shadow-sm cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98] relative"
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
  const activeIndex = activeNote
    ? notes.findIndex((n) => n.id === activeNote.id)
    : -1;
  const activeColor = activeIndex >= 0 ? PALETTE[activeIndex % PALETTE.length] : PALETTE[0];

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
          {notes.map((note, idx) => (
            <SortableNoteCard
              key={note.id}
              note={note}
              index={idx}
              color={PALETTE[idx % PALETTE.length]}
              onClick={() => onClickNote(note, PALETTE[idx % PALETTE.length])}
              disabled={disabled}
            />
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeNote ? (
          <div className="rounded-[1.5rem] shadow-2xl scale-[1.03] rotate-1 opacity-95 cursor-grabbing">
            <NoteCardContent note={activeNote} color={activeColor} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
