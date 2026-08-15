import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import SettingsSheet from '@/components/SettingsSheet';
import { useTodos } from '@/hooks/useTodos';
import { useCreate } from '@/contexts/CreateContext';
import { requestBottomSheet } from '@/lib/app-events';
import {
  Loader2,
  CheckCircle,
  Trash2,
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  PanelTopOpen,
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
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
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
  'w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:border-todo focus:ring-2 focus:ring-todo/20 text-sm font-semibold text-foreground transition-all [color-scheme:light] dark:[color-scheme:dark] placeholder:text-muted-foreground/50';

// ─── Quick-add form ──────────────────────────────────────────────────────────
function QuickAddForm({ onSubmit }: { onSubmit: (data: TodoFormValues) => Promise<void> }) {
  const [title, setTitle]           = useState('');
  const [expanded, setExpanded]     = useState(false);
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate]       = useState('');
  const [dueTime, setDueTime]       = useState('');
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
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-2xl border border-border/60 bg-card transition-colors focus-within:border-todo/40"
    >
      {/* Main row */}
      <div className="flex items-center gap-2 px-4 py-1">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/20 text-muted-foreground/35">
          <Plus size={15} strokeWidth={2.5} />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tambahkan to-do baru…"
          aria-label="Judul to-do baru"
          className="flex-1 bg-transparent py-3.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 outline-none leading-tight"
        />
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Sembunyikan detail' : 'Tambah detail'}
          className="flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground/40 transition-colors hover:bg-muted/50 hover:text-muted-foreground"
        >
          {expanded ? <ChevronUp size={17} strokeWidth={2} /> : <ChevronDown size={17} strokeWidth={2} />}
        </button>
      </div>

      {/* Expanded detail section */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-3 border-t border-border/40 px-4 pb-4 pt-3">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Catatan tambahan (opsional)"
                rows={2}
                className="w-full resize-none rounded-xl border border-border/60 bg-background p-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-todo focus:ring-2 focus:ring-todo/20 transition-all"
              />
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="text-pill-label mb-1.5 block">Tanggal</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full min-h-10 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-todo transition-all [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-pill-label mb-1.5 block">Waktu</label>
                  <input
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full min-h-10 rounded-xl border border-border/60 bg-background px-3 py-2 text-sm font-semibold text-foreground outline-none focus:border-todo transition-all [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={!title.trim() || submitting}
                  className="shrink-0 rounded-full bg-todo px-5 text-white hover:bg-todo/90 disabled:opacity-40"
                >
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Tambah'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed submit — only when title is typed */}
      {!expanded && title.trim() && (
        <div className="-mt-1 px-4 pb-3">
          <Button
            type="submit"
            disabled={submitting}
            className="rounded-full bg-todo px-5 text-white hover:bg-todo/90 disabled:opacity-40"
          >
            {submitting && <Loader2 size={14} className="mr-1.5 animate-spin" />}
            {submitting ? 'Menyimpan…' : 'Tambahkan'}
          </Button>
        </div>
      )}
    </form>
  );
}

// ─── Filter bar ──────────────────────────────────────────────────────────────
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
    { key: 'all',    label: 'Semua',   count: counts.all },
    { key: 'active', label: 'Aktif',   count: counts.active },
    { key: 'done',   label: 'Selesai', count: counts.done },
  ];

  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="flex gap-1 rounded-[1rem] bg-muted/50 p-1" role="tablist" aria-label="Filter to-do">
      {tabs.map(({ key, label, count }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={[
              'relative flex flex-1 items-center justify-center gap-1.5 rounded-[0.75rem] px-3 py-2.5 text-xs font-bold transition-colors select-none active:scale-[0.97]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-todo/40 focus-visible:ring-offset-2',
              isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80',
            ].join(' ')}
          >
            {isActive && (
              <motion.span
                layoutId="todo-filter-pill"
                className="absolute inset-0 rounded-[0.75rem] bg-card shadow-sm"
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
              />
            )}
            <span className="relative z-10">{label}</span>
            <span
              className={[
                'relative z-10 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums transition-colors',
                isActive
                  ? 'bg-todo/10 text-todo-text'
                  : 'bg-muted-foreground/10 text-muted-foreground',
              ].join(' ')}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
export default function TodoPage() {
  const { user } = useAuthContext();
  const { todos, loading, createTodo, updateTodo, deleteTodo } = useTodos(user?.id);
  const { pendingCreate, clearCreate } = useCreate();

  const [search, setSearch]   = useState('');
  const [filter, setFilter]   = useState<FilterTab>('all');
  const [isFormOpen, setIsFormOpen]   = useState(false);
  const [selectedTodo, setSelectedTodo] = useState<TodoType | null>(null);
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [orderedIds, setOrderedIds]   = useState<string[] | null>(null);

  const newForm = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: '', description: '', due_date: '', due_time: '' },
  });
  const editForm = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: '', description: '', due_date: '', due_time: '' },
  });

  // ── Derived lists ──────────────────────────────────────────────────────────
  const allTodos = useMemo(() => {
    if (!search) return todos as TodoType[];
    const lower = search.toLowerCase();
    return (todos as TodoType[]).filter((t) => t.title.toLowerCase().includes(lower));
  }, [todos, search]);

  const displayedTodos = useMemo(() => {
    if (filter === 'active') return allTodos.filter((t) => !t.is_done);
    if (filter === 'done')   return allTodos.filter((t) => t.is_done);
    return allTodos;
  }, [allTodos, filter]);

  useEffect(() => {
    if (displayedTodos.length > 0) {
      setOrderedIds((prev) => {
        if (!prev) return displayedTodos.map((t) => t.id);
        const existing = new Set(prev);
        const newIds   = displayedTodos.filter((t) => !existing.has(t.id)).map((t) => t.id);
        const still    = prev.filter((id) => displayedTodos.some((t) => t.id === id));
        return [...newIds, ...still];
      });
    } else {
      setOrderedIds(null);
    }
  }, [displayedTodos]);

  const sortedTodos = useMemo(() => {
    if (!orderedIds) return displayedTodos;
    const map = new Map(displayedTodos.map((t) => [t.id, t]));
    return orderedIds.filter((id) => map.has(id)).map((id) => map.get(id)!) as TodoType[];
  }, [displayedTodos, orderedIds]);

  const pendingTodos   = sortedTodos.filter((t) => !t.is_done);
  const completedTodos = sortedTodos.filter((t) => t.is_done);

  const counts = useMemo(
    () => ({
      all:    allTodos.length,
      active: allTodos.filter((t) => !t.is_done).length,
      done:   allTodos.filter((t) => t.is_done).length,
    }),
    [allTodos],
  );

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isEditOpen) setIsEditOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEditOpen]);

  useEffect(() => {
    if (pendingCreate === 'todo') {
      newForm.reset();
      setIsFormOpen(true);
      clearCreate();
    }
  }, [pendingCreate, clearCreate, newForm]);

  // ── Sensors ────────────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor,  { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleQuickCreate = useCallback(
    async (data: TodoFormValues) => {
      await createTodo({
        title:       data.title,
        description: data.description || null,
        due_date:    data.due_date || null,
        due_time:    data.due_time || null,
        is_done:     false,
      });
    },
    [createTodo],
  );

  const onSubmitNew = useCallback(
    async (data: TodoFormValues) => {
      try {
        await createTodo({
          title:       data.title,
          description: data.description || null,
          due_date:    data.due_date || null,
          due_time:    data.due_time || null,
          is_done:     false,
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
        title:       todo.title,
        description: todo.description ?? '',
        due_date:    todo.due_date ?? '',
        due_time:    todo.due_time ?? '',
      });
      setIsEditOpen(true);
    },
    [editForm],
  );

  const openCreateAction = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setIsFormOpen(true);
      return;
    }
    requestBottomSheet();
  };

  const onSubmitEdit = useCallback(
    async (data: TodoFormValues) => {
      if (!selectedTodo) return;
      try {
        await updateTodo(selectedTodo.id, {
          title:       data.title,
          description: data.description || null,
          due_date:    data.due_date || null,
          due_time:    data.due_time || null,
        });
        setSelectedTodo((prev) =>
          prev
            ? { ...prev, title: data.title, description: data.description || null,
                due_date: data.due_date || null, due_time: data.due_time || null }
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

  const handleDragCancel = useCallback(() => setActiveDragId(null), []);

  const activeDragTodo = activeDragId
    ? allTodos.find((t) => t.id === activeDragId) ?? null
    : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="app-page">

      {/* ── Header ── */}
      <div className="app-page-header">
        <div className="app-page-header-inner">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-pill-label mb-1 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-page-title">To-Do List</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="lg:hidden inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-todo/30 text-todo-text transition-colors hover:bg-todo/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-todo focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={() => requestBottomSheet()}
                aria-label="Buka menu tambah to-do"
              >
                <PanelTopOpen size={18} strokeWidth={2.3} />
              </button>
              <SettingsSheet
                avatarBg="bg-todo/15"
                avatarTextColor="text-todo-text"
                viewport="mobile"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="app-page-body">
        {loading ? (
          <PageLoading accent="todo" label="Memuat to-do…" />
        ) : (
          <div className="space-y-3">

            {/* Search */}
            <SearchBar value={search} onChange={setSearch} placeholder="Cari to-do…" />

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
                      onClick={openCreateAction}
                      className="rounded-full bg-todo px-6 py-3 text-white hover:bg-todo/90"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      Buat To-Do
                    </Button>
                  ) : undefined
                }
              />
            )}

            {/* Drag-and-drop todo list */}
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
                      'Mengambil to-do. Gunakan tombol panah untuk memindahkan, Enter untuk meletakkan, Escape untuk membatalkan.',
                    onDragOver: ({ active, over }) =>
                      over && active.id !== over.id ? 'Berpindah posisi.' : '',
                    onDragEnd: ({ over }) =>
                      over ? 'To-do diletakkan di posisi baru.' : 'Pengurutan dibatalkan.',
                    onDragCancel: () => 'Pengurutan dibatalkan.',
                  },
                  screenReaderInstructions: {
                    draggable:
                      'Untuk memindahkan to-do, tekan Space pada grip, gunakan tombol panah, tekan Enter untuk meletakkan.',
                  },
                }}
              >
                <SortableContext items={sortedTodos.map((t) => t.id)} strategy={rectSortingStrategy}>
                  <div className="space-y-5" role="list" aria-label="Daftar to-do">

                    {/* Pending */}
                    {pendingTodos.length > 0 && (
                      <div className="space-y-2">
                        {filter !== 'done' && (
                          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60 px-0.5">
                            Belum selesai
                          </h3>
                        )}
                        <AnimatePresence mode="popLayout">
                          {pendingTodos.map((todo) => (
                            <TodoCard
                              key={todo.id}
                              todo={todo}
                              onClick={() => handleOpenEdit(todo)}
                              onToggle={(e) => handleToggle(todo.id, todo.is_done, e)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Completed */}
                    {completedTodos.length > 0 && filter !== 'active' && (
                      <div className="space-y-2">
                        {filter === 'all' && (
                          <div className="border-t border-border/40 pt-2" />
                        )}
                        {filter !== 'done' && (
                          <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/60 px-0.5">
                            Selesai
                          </h3>
                        )}
                        <AnimatePresence mode="popLayout">
                          {completedTodos.map((todo) => (
                            <TodoCard
                              key={todo.id}
                              todo={todo}
                              onClick={() => handleOpenEdit(todo)}
                              onToggle={(e) => handleToggle(todo.id, todo.is_done, e)}
                            />
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </SortableContext>

                <DragOverlay>
                  {activeDragTodo ? <TodoCardOverlay todo={activeDragTodo} /> : null}
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
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsEditOpen(false)}
            />
            <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center px-5">
              <motion.div
                key="todo-modal"
                className="pointer-events-auto w-full max-w-sm"
                initial={{ opacity: 0, scale: 0.92, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 16 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              >
                <div className="overflow-hidden rounded-[1.5rem] border border-border/60 bg-card shadow-elevation-3">
                  <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="flex flex-col">

                    {/* Modal header */}
                    <div className="flex items-center justify-between border-b border-border/40 px-5 pb-3.5 pt-4">
                      <button
                        type="button"
                        onClick={() => setIsEditOpen(false)}
                        className="text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                      >
                        Batal
                      </button>
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-todo-text">
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
                    <div className="max-h-[55vh] space-y-4 overflow-y-auto px-5 pb-5 pt-4">
                      <input
                        {...editForm.register('title')}
                        placeholder="Apa yang harus dikerjakan?"
                        aria-label="Judul to-do"
                        className="w-full border-b-2 border-todo/30 bg-transparent pb-2.5 text-input-title text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-todo"
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
                        className="w-full resize-none rounded-xl border border-border/60 bg-background p-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-todo focus:ring-2 focus:ring-todo/20 transition-all"
                      />

                      <div className="flex gap-3">
                        <div className="min-w-0 flex-1">
                          <label className="text-pill-label mb-1.5 block">Tanggal</label>
                          <input
                            {...editForm.register('due_date')}
                            type="date"
                            className="w-full min-h-11 rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none transition-all focus:border-todo [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="text-pill-label mb-1.5 block">Waktu</label>
                          <input
                            {...editForm.register('due_time')}
                            type="time"
                            className="w-full min-h-11 rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm font-semibold text-foreground outline-none transition-all focus:border-todo [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delete */}
                    <div className="border-t border-border/40 px-5 py-3.5">
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedTodo.id)}
                        disabled={deletingId === selectedTodo.id}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/8 py-2.5 text-sm font-semibold text-destructive transition-colors hover:bg-destructive/14 disabled:opacity-60"
                      >
                        {deletingId === selectedTodo.id ? (
                          <><Loader2 size={14} className="animate-spin" /> Menghapus…</>
                        ) : (
                          <><Trash2 size={14} /> Hapus To-Do</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="mt-3.5 flex justify-center">
                  <Button
                    onClick={() => setIsEditOpen(false)}
                    variant="secondary"
                    className="rounded-full border border-border/50 bg-card/80 shadow-elevation-1 hover:bg-card"
                  >
                    <X size={15} strokeWidth={2.5} />
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
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-sheet h-[90dvh] landscape:h-[75dvh] flex-col overflow-hidden rounded-t-[1.75rem] border-t border-border/60 bg-card shadow-elevation-3 outline-none sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2">
            <div className="mx-auto mb-1 mt-3.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />

            <form
              onSubmit={newForm.handleSubmit(onSubmitNew)}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6"
            >
              <h3 className="text-modal-title mb-6 mt-3">To-Do Baru</h3>

              <div className="space-y-5 mb-6">
                <div>
                  <input
                    {...newForm.register('title')}
                    placeholder="Apa yang harus dikerjakan?"
                    className="w-full border-b-2 border-border bg-transparent py-3 text-xl font-bold text-foreground outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-todo"
                  />
                  {newForm.formState.errors.title && (
                    <FormError className="mt-2" size="xs">
                      {newForm.formState.errors.title.message}
                    </FormError>
                  )}
                </div>

                <textarea
                  {...newForm.register('description')}
                  placeholder="Catatan tambahan (opsional)"
                  className="h-20 w-full resize-none rounded-xl border border-border/60 bg-background p-3.5 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-todo focus:ring-2 focus:ring-todo/20 transition-all"
                />

                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-pill-label mb-2 block">Tanggal</label>
                    <input {...newForm.register('due_date')} type="date" className={INP} />
                  </div>
                  <div className="flex-1">
                    <label className="text-pill-label mb-2 block">Waktu</label>
                    <input {...newForm.register('due_time')} type="time" className={INP} />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="min-h-[3.25rem] w-full rounded-[1rem] bg-todo py-3.5 text-[15px] font-bold text-white hover:bg-todo/90 disabled:opacity-55 transition-all"
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
