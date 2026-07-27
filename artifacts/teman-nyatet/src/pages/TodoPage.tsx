import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import SettingsSheet from '@/components/SettingsSheet';
import { useTodos } from '@/hooks/useTodos';
import { useCreate } from '@/contexts/CreateContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Loader2,
  CheckCircle,
  Check,
  Clock,
  Calendar,
  Trash2,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FormError, PageEmpty, PageLoading } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import SearchBar from '@/components/SearchBar';
import { Drawer } from 'vaul';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  arrayMove,
} from '@dnd-kit/sortable';
import { TodoCard, TodoCardOverlay } from '@/components/TodoCard';
import type { Todo as TodoType } from '@/lib/database.types';

// ─── Schema ─────────────────────────────────────────────────────────────────
const todoSchema = z.object({
  title:       z.string().min(1, 'Judul wajib diisi'),
  description: z.string().optional(),
  due_date:    z.string().optional(),
  due_time:    z.string().optional(),
});

type TodoFormValues = z.infer<typeof todoSchema>;

type FilterTab = 'all' | 'active' | 'done';

const INP =
  'w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:border-todo focus:ring-2 focus:ring-todo/20 text-sm font-bold text-foreground transition-all [color-scheme:light] dark:[color-scheme:dark]';

// ─── Quick-add form ─────────────────────────────────────────────────────────
function QuickAddForm({
  onSubmit,
}: {
  onSubmit: (data: TodoFormValues) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title: trimmed,
        description: description.trim() || undefined,
        due_date: dueDate || undefined,
        due_time: dueTime || undefined,
      });
      setTitle('');
      setDescription('');
      setDueDate('');
      setDueTime('');
      setExpanded(false);
      inputRef.current?.focus();
    } catch {
      // handled in parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card rounded-[1.25rem] shadow-elevation-1 border border-card-border overflow-hidden transition-shadow focus-within:shadow-md focus-within:border-todo/40">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center border-2 border-dashed border-muted-foreground/20 text-muted-foreground/40">
          <Plus size={16} strokeWidth={2.5} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tambahkan to-do baru..."
          aria-label="Judul to-do baru"
          className="flex-1 bg-transparent text-sm font-bold text-foreground placeholder:text-muted-foreground/50 outline-none py-3 leading-tight"
        />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Sembunyikan detail' : 'Tambah detail'}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
        >
          {expanded ? (
            <ChevronUp size={18} strokeWidth={2} />
          ) : (
            <ChevronDown size={18} strokeWidth={2} />
          )}
        </button>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                rows={2}
                className="w-full resize-none bg-muted/40 border border-border rounded-xl p-3 text-sm font-medium placeholder:text-muted-foreground/50 outline-none focus:border-todo focus:ring-2 focus:ring-todo/20 transition-all text-foreground"
              />
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Tanggal</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full min-h-10 bg-muted/40 border border-border rounded-xl py-2 px-3 text-sm font-bold outline-none focus:border-todo transition-all [color-scheme:light] dark:[color-scheme:dark] text-foreground"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Waktu</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full min-h-10 bg-muted/40 border border-border rounded-xl py-2 px-3 text-sm font-bold outline-none focus:border-todo transition-all [color-scheme:light] dark:[color-scheme:dark] text-foreground"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!title.trim() || submitting}
                  size="sm"
                  className="rounded-full bg-todo text-white hover:bg-todo/90 px-5 h-10 shrink-0 disabled:opacity-40"
                >
                  {submitting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Tambah'
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed: small submit button on the right */}
      {!expanded && title.trim() && (
        <div className="px-4 pb-3 -mt-1">
          <Button
            type="submit"
            disabled={submitting}
            size="sm"
            className="rounded-full bg-todo text-white hover:bg-todo/90 px-4 py-1.5 text-xs disabled:opacity-40"
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin mr-1" />
            ) : null}
            {submitting ? 'Menyimpan...' : 'Tambahkan'}
          </Button>
        </div>
      )}
    </form>
  );
}

// ─── Filter bar ─────────────────────────────────────────────────────────────
function FilterBar({
  active,
  onChange,
  counts,
}: {
  active: FilterTab;
  onChange: (tab: FilterTab) => void;
  counts: { all: number; active: number; done: number };
}) {
  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'Semua', count: counts.all },
    { key: 'active', label: 'Aktif', count: counts.active },
    { key: 'done', label: 'Selesai', count: counts.done },
  ];

  return (
    <div className="flex gap-1 bg-muted/60 rounded-2xl p-1" role="tablist" aria-label="Filter to-do">
      {tabs.map(({ key, label, count }) => (
        <button
          key={key}
          role="tab"
          aria-selected={active === key}
          onClick={() => onChange(key)}
          className={[
            'flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-xs font-bold rounded-xl transition-all select-none',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-todo/40',
            active === key
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {label}
          <span
            className={[
              'text-[10px] font-bold px-1.5 py-0.5 rounded-md transition-all',
              active === key
                ? 'bg-todo/10 text-todo-text'
                : 'bg-muted-foreground/10 text-muted-foreground',
            ].join(' ')}
          >
            {count}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────
export default function TodoPage() {
  const { user } = useAuthContext();
  const { todos, loading, createTodo, updateTodo, deleteTodo } = useTodos(
    user?.id,
  );
  const { pendingCreate, clearCreate } = useCreate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');

  // ── Drawer (create) & Modal (edit) ──
  const [isFormOpen, setIsFormOpen] = useState(false);
  const newForm = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: '', description: '', due_date: '', due_time: '' },
  });

  const [selectedTodo, setSelectedTodo] = useState<TodoType | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editForm = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: '', description: '', due_date: '', due_time: '' },
  });

  // ── Drag state ──
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  // Keep orderedIds in sync with filtered + sorted todos
  const allTodos = useMemo(() => {
    // Apply search filter
    if (!search) return todos as TodoType[];
    const lower = search.toLowerCase();
    return (todos as TodoType[]).filter((t) =>
      t.title.toLowerCase().includes(lower),
    );
  }, [todos, search]);

  // Apply tab filter
  const displayedTodos = useMemo(() => {
    if (filter === 'active') return allTodos.filter((t) => !t.is_done);
    if (filter === 'done') return allTodos.filter((t) => t.is_done);
    return allTodos;
  }, [allTodos, filter]);

  // Initialize orderedIds when data changes
  useEffect(() => {
    if (displayedTodos.length > 0) {
      setOrderedIds((prev) => {
        if (!prev) return displayedTodos.map((t) => t.id);
        // Preserve existing order for known ids, append new ones at top
        const existing = new Set(prev);
        const newIds = displayedTodos
          .filter((t) => !existing.has(t.id))
          .map((t) => t.id);
        const stillPresent = prev.filter((id) =>
          displayedTodos.some((t) => t.id === id),
        );
        return [...newIds, ...stillPresent];
      });
    } else {
      setOrderedIds(null);
    }
  }, [displayedTodos]);

  // Sort displayedTodos by orderedIds
  const sortedTodos = useMemo(() => {
    if (!orderedIds) return displayedTodos;
    const map = new Map(displayedTodos.map((t) => [t.id, t]));
    return orderedIds
      .filter((id) => map.has(id))
      .map((id) => map.get(id)!) as TodoType[];
  }, [displayedTodos, orderedIds]);

  const pendingTodos = sortedTodos.filter((t) => !t.is_done);
  const completedTodos = sortedTodos.filter((t) => t.is_done);

  // ── Keyboard ──
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditOpen) setIsEditOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEditOpen]);

  // ── pendingCreate from bottom sheet ──
  useEffect(() => {
    if (pendingCreate === 'todo') {
      newForm.reset();
      setIsFormOpen(true);
      clearCreate();
    }
  }, [pendingCreate, clearCreate, newForm]);

  // ── Sensors ──
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Counts ──
  const counts = useMemo(
    () => ({
      all: allTodos.length,
      active: allTodos.filter((t) => !t.is_done).length,
      done: allTodos.filter((t) => t.is_done).length,
    }),
    [allTodos],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleQuickCreate = useCallback(
    async (data: TodoFormValues) => {
      await createTodo({
        title: data.title,
        description: data.description || null,
        due_date: data.due_date || null,
        due_time: data.due_time || null,
        is_done: false,
      });
    },
    [createTodo],
  );

  const onSubmitNew = useCallback(
    async (data: TodoFormValues) => {
      try {
        await createTodo({
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          due_time: data.due_time || null,
          is_done: false,
        });
        setIsFormOpen(false);
        newForm.reset();
      } catch {
        toast.error('Gagal menyimpan to-do. Coba lagi.');
      }
    },
    [createTodo, newForm],
  );

  const handleOpenEdit = useCallback(
    (todo: TodoType) => {
      setSelectedTodo(todo);
      editForm.reset({
        title: todo.title,
        description: todo.description ?? '',
        due_date: todo.due_date ?? '',
        due_time: todo.due_time ?? '',
      });
      setIsEditOpen(true);
    },
    [editForm],
  );

  const onSubmitEdit = useCallback(
    async (data: TodoFormValues) => {
      if (!selectedTodo) return;
      try {
        await updateTodo(selectedTodo.id, {
          title: data.title,
          description: data.description || null,
          due_date: data.due_date || null,
          due_time: data.due_time || null,
        });
        setSelectedTodo((prev) =>
          prev
            ? {
                ...prev,
                title: data.title,
                description: data.description || null,
                due_date: data.due_date || null,
                due_time: data.due_time || null,
              }
            : prev,
        );
        setIsEditOpen(false);
      } catch {
        toast.error('Gagal menyimpan perubahan.');
      }
    },
    [selectedTodo, updateTodo],
  );

  const handleToggle = useCallback(
    async (todoId: string, currentStatus: boolean, e: React.MouseEvent) => {
      e.stopPropagation();
      await updateTodo(todoId, { is_done: !currentStatus });
    },
    [updateTodo],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteTodo(id);
        setIsEditOpen(false);
      } finally {
        setDeletingId(null);
      }
    },
    [deleteTodo],
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragId(null);
      const { active, over } = event;
      if (!over || active.id === over.id || !orderedIds) return;

      const oldIndex = orderedIds.indexOf(String(active.id));
      const newIndex = orderedIds.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;

      setOrderedIds(arrayMove(orderedIds, oldIndex, newIndex));
    },
    [orderedIds],
  );

  const handleDragCancel = useCallback(() => {
    setActiveDragId(null);
  }, []);

  // ── Drag overlay data ──
  const activeDragTodo = activeDragId
    ? allTodos.find((t) => t.id === activeDragId) ?? null
    : null;

  // ── Render ──
  return (
    <div className="flex flex-col h-full bg-background min-h-dvh pb-32 lg:pb-16">
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="px-5 py-5 pb-4 space-y-4 sm:px-6 lg:px-10 lg:py-7 lg:pb-5 max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 lg:hidden">
                TEMAN NYATET
              </div>
              <h1 className="text-page-title">To-Do List</h1>
            </div>
            <SettingsSheet
              avatarBg="bg-todo/15"
              avatarTextColor="text-todo-text"
            />
          </div>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Cari to-do..."
          />
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-5 sm:px-6 lg:px-10 flex-1 max-w-screen-xl mx-auto w-full">
        {loading ? (
          <div className="pt-5 lg:pt-7">
            <PageLoading accent="todo" label="Memuat to-do…" />
          </div>
        ) : (
          <div className="pt-5 pb-8 lg:pt-7 space-y-5">
            {/* Quick-add */}
            <QuickAddForm onSubmit={handleQuickCreate} />

            {/* Filter bar */}
            {allTodos.length > 0 && (
              <FilterBar active={filter} onChange={setFilter} counts={counts} />
            )}

            {/* Empty state */}
            {sortedTodos.length === 0 && (
              <PageEmpty
                accent="todo"
                icon={CheckCircle}
                title={
                  search
                    ? 'Tidak ada hasil'
                    : filter !== 'all'
                      ? filter === 'done'
                        ? 'Belum ada yang selesai'
                        : 'Semua sudah selesai!'
                      : 'Belum ada to-do'
                }
                description={
                  search
                    ? 'Coba kata kunci lain atau hapus filter.'
                    : filter !== 'all'
                      ? filter === 'done'
                        ? 'Selesaikan tugas untuk melihatnya di sini.'
                        : 'Kamu bisa tambah to-do baru di atas.'
                      : 'Mulai dengan menulis to-do di atas.'
                }
                cta={
                  !search && filter === 'all' ? (
                    <Button
                      onClick={() => setIsFormOpen(true)}
                      className="bg-todo text-white hover:bg-todo/90 rounded-full px-6 py-3.5"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                      Buat To-Do
                    </Button>
                  ) : undefined
                }
              />
            )}

            {/* ── Todo list (drag & drop) ── */}
            {sortedTodos.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragCancel={handleDragCancel}
                accessibility={{
                  announcements: {
                    onDragStart: () =>
                      `Mengambil to-do. Gunakan tombol panah untuk memindahkan, Enter untuk meletakkan, Escape untuk membatalkan.`,
                    onDragOver: ({ active, over }) =>
                      over && active.id !== over.id
                        ? `Berpindah posisi.`
                        : '',
                    onDragEnd: ({ over }) =>
                      over
                        ? `To-do diletakkan di posisi baru.`
                        : `Pengurutan dibatalkan.`,
                    onDragCancel: () => `Pengurutan dibatalkan.`,
                  },
                  screenReaderInstructions: {
                    draggable:
                      'Untuk memindahkan to-do, tekan Space pada grip, gunakan tombol panah, tekan Enter untuk meletakkan.',
                  },
                }}
              >
                <SortableContext
                  items={sortedTodos.map((t) => t.id)}
                  strategy={rectSortingStrategy}
                >
                  <div className="space-y-6" role="list" aria-label="Daftar to-do">
                    {/* Pending */}
                    {pendingTodos.length > 0 && (
                      <div className="space-y-2.5">
                        <h3 className="text-pill-label px-1">
                          {filter === 'done' ? '' : 'Belum selesai'}
                        </h3>
                        <AnimatePresence mode="popLayout">
                          {pendingTodos.map((todo) => (
                            <TodoCard
                              key={todo.id}
                              todo={todo}
                              onClick={() => handleOpenEdit(todo)}
                              onToggle={(e) =>
                                handleToggle(todo.id, todo.is_done, e)
                              }
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Completed */}
                    {completedTodos.length > 0 && filter !== 'active' && (
                      <div className="space-y-2.5">
                        {filter === 'all' && (
                          <div className="border-t border-border/40 pt-6" />
                        )}
                        {filter !== 'done' && (
                          <h3 className="text-pill-label px-1">Selesai</h3>
                        )}
                        <AnimatePresence mode="popLayout">
                          {completedTodos.map((todo) => (
                            <TodoCard
                              key={todo.id}
                              todo={todo}
                              onClick={() => handleOpenEdit(todo)}
                              onToggle={(e) =>
                                handleToggle(todo.id, todo.is_done, e)
                              }
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeDragTodo ? (
                    <TodoCardOverlay todo={activeDragTodo} />
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Modal ── */}
      <AnimatePresence>
        {isEditOpen && selectedTodo && (
          <>
            <motion.div
              key="todo-backdrop"
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsEditOpen(false)}
            />
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5 pointer-events-none">
              <motion.div
                key="todo-modal"
                className="w-full max-w-sm pointer-events-auto"
                initial={{ opacity: 0, scale: 0.88, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.88, y: 20 }}
                transition={{
                  duration: 0.25,
                  ease: [0.32, 0.72, 0, 1],
                }}
              >
                <div className="bg-card rounded-[24px] overflow-hidden shadow-2xl border border-todo/20">
                  <form
                    onSubmit={editForm.handleSubmit(onSubmitEdit)}
                    className="flex flex-col"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-todo/10">
                      <button
                        type="button"
                        onClick={() => setIsEditOpen(false)}
                        className="text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Batal
                      </button>
                      <span className="text-[11px] font-bold text-todo-text uppercase tracking-widest">
                        Edit To-Do
                      </span>
                      <Button
                        type="submit"
                        size="sm"
                        className="rounded-full bg-todo text-white hover:bg-todo/90 shadow-sm"
                      >
                        Simpan
                      </Button>
                    </div>

                    {/* Fields */}
                    <div className="px-5 pb-5 space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                      <input
                        {...editForm.register('title')}
                        placeholder="Apa yang harus dikerjakan?"
                        aria-label="Judul to-do"
                        className="w-full text-input-title bg-transparent border-b-2 border-todo/40 pb-2.5 outline-none focus:border-todo transition-colors placeholder:text-muted-foreground/60 text-foreground"
                      />
                      {editForm.formState.errors.title && (
                        <FormError size="xs" className="-mt-1">
                          {editForm.formState.errors.title.message}
                        </FormError>
                      )}

                      <textarea
                        {...editForm.register('description')}
                        placeholder="Catatan tambahan (opsional)"
                        aria-label="Deskripsi to-do"
                        rows={3}
                        className="w-full resize-none bg-muted/50 border border-border rounded-xl p-3 text-sm font-medium placeholder:text-muted-foreground/60 text-foreground focus:border-todo focus:ring-2 focus:ring-todo/20 transition-all"
                      />

                      <div className="flex gap-3">
                        <div className="flex-1 min-w-0">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                            Tanggal
                          </label>
                          <input
                            {...editForm.register('due_date')}
                            type="date"
                            className="w-full min-h-11 bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 outline-none focus:border-todo text-sm font-bold text-foreground transition-all [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                            Waktu
                          </label>
                          <input
                            {...editForm.register('due_time')}
                            type="time"
                            className="w-full min-h-11 bg-muted/50 border border-border rounded-xl py-2.5 px-3.5 outline-none focus:border-todo text-sm font-bold text-foreground transition-all [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="border-t border-todo/10 px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedTodo.id)}
                        disabled={deletingId === selectedTodo.id}
                        className="w-full flex items-center justify-center gap-2 text-destructive font-bold text-sm py-2.5 rounded-2xl bg-destructive/10 hover:bg-destructive/15 transition-colors disabled:opacity-70"
                      >
                        {deletingId === selectedTodo.id ? (
                          <>
                            <Loader2 size={15} className="animate-spin" />{' '}
                            Menghapus...
                          </>
                        ) : (
                          <>
                            <Trash2 size={15} /> Hapus To-Do
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="flex justify-center mt-4">
                  <Button
                    onClick={() => setIsEditOpen(false)}
                    variant="secondary"
                    className="rounded-full shadow-lg bg-card/80 hover:bg-card border border-border/50"
                  >
                    <X size={16} strokeWidth={2.5} />
                    Tutup
                  </Button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── New-Todo Drawer ── */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-sheet h-[90dvh] landscape:h-[75dvh] sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full z-50 outline-none border-t border-border/70 shadow-elevated">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-6 mt-4" />
            <form
              onSubmit={newForm.handleSubmit(onSubmitNew)}
              className="flex flex-col px-5 sm:px-6 pb-8 overflow-y-auto"
            >
              <h3 className="text-modal-title mb-6">To-Do Baru</h3>
              <div className="space-y-5 mb-8">
                <div>
                  <input
                    {...newForm.register('title')}
                    placeholder="Apa yang harus dikerjakan?"
                    className="w-full text-xl font-bold bg-transparent border-b-2 border-border py-3 outline-none focus:border-todo transition-colors placeholder:text-muted-foreground/50 text-foreground"
                  />
                  {newForm.formState.errors.title && (
                    <FormError className="mt-2">
                      {newForm.formState.errors.title.message}
                    </FormError>
                  )}
                </div>
                <textarea
                  {...newForm.register('description')}
                  placeholder="Catatan tambahan (opsional)"
                  className="w-full h-24 resize-none bg-muted/50 border border-border rounded-xl p-4 outline-none text-sm font-medium placeholder:text-muted-foreground/50 focus:border-todo focus:ring-2 focus:ring-todo/20 transition-all"
                />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                      Tanggal
                    </label>
                    <input
                      {...newForm.register('due_date')}
                      type="date"
                      className={INP}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                      Waktu
                    </label>
                    <input
                      {...newForm.register('due_time')}
                      type="time"
                      className={INP}
                    />
                  </div>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-todo text-white hover:bg-todo/90 text-lg py-4 rounded-[1.25rem] mt-auto"
              >
                Simpan To-Do
              </Button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
