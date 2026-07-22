import React, { useState, useMemo, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import SettingsSheet from '@/components/SettingsSheet';
import { useTodos } from '@/hooks/useTodos';
import { useCreate } from '@/contexts/CreateContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, CheckCircle, Check, Clock, Calendar, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import SearchBar from '@/components/SearchBar';
import { Drawer } from 'vaul';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedListItem } from '@/components/AnimatedListItem';

const todoSchema = z.object({
  title:       z.string().min(1, 'Judul To-do wajib diisi'),
  description: z.string().optional(),
  due_date:    z.string().optional(),
  due_time:    z.string().optional(),
});

type TodoFormValues = z.infer<typeof todoSchema>;

// The type returned by useTodos
type Todo = { id: string; title: string; description: string | null; due_date: string | null; due_time: string | null; is_done: boolean; created_at: string };

const INP = 'w-full bg-white border border-border rounded-xl py-3 px-4 outline-none focus:border-[#9CB4D4] focus:ring-2 focus:ring-[#9CB4D4]/20 text-sm font-bold text-foreground transition-all';

export default function TodoPage() {
  const { user } = useAuthContext();
  const { todos, loading, createTodo, updateTodo, deleteTodo } = useTodos(user?.id);
  const { pendingCreate, clearCreate } = useCreate();
  const [search, setSearch] = useState('');

  // New-todo Drawer
  const [isFormOpen, setIsFormOpen] = useState(false);
  const newForm = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: '', description: '', due_date: '', due_time: '' },
  });

  // Edit modal
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const editForm = useForm<TodoFormValues>({
    resolver: zodResolver(todoSchema),
    defaultValues: { title: '', description: '', due_date: '', due_time: '' },
  });

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isEditOpen) setIsEditOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isEditOpen]);

  // pendingCreate from bottom sheet
  useEffect(() => {
    if (pendingCreate === 'todo') {
      newForm.reset();
      setIsFormOpen(true);
      clearCreate();
    }
  }, [pendingCreate]);

  const filteredTodos = useMemo(() => {
    if (!search) return todos as Todo[];
    const lower = search.toLowerCase();
    return (todos as Todo[]).filter(t => t.title.toLowerCase().includes(lower));
  }, [todos, search]);

  const pendingTodos   = filteredTodos.filter(t => !t.is_done);
  const completedTodos = filteredTodos.filter(t => t.is_done);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onSubmitNew = async (data: TodoFormValues) => {
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
  };

  const handleOpenEdit = (todo: Todo) => {
    setSelectedTodo(todo);
    editForm.reset({
      title:       todo.title,
      description: todo.description ?? '',
      due_date:    todo.due_date ?? '',
      due_time:    todo.due_time ?? '',
    });
    setIsEditOpen(true);
  };

  const onSubmitEdit = async (data: TodoFormValues) => {
    if (!selectedTodo) return;
    try {
      await updateTodo(selectedTodo.id, {
        title:       data.title,
        description: data.description || null,
        due_date:    data.due_date || null,
        due_time:    data.due_time || null,
      });
      setSelectedTodo(prev => prev
        ? { ...prev, title: data.title, description: data.description || null, due_date: data.due_date || null, due_time: data.due_time || null }
        : prev
      );
      setIsEditOpen(false);
    } catch {
      toast.error('Gagal menyimpan perubahan.');
    }
  };

  const handleToggle = async (todoId: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateTodo(todoId, { is_done: !currentStatus });
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteTodo(id);
      setIsEditOpen(false);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Todo card ────────────────────────────────────────────────────────────────
  const renderTodoItem = (todo: Todo) => (
    <AnimatedListItem
      key={todo.id}
      onClick={() => handleOpenEdit(todo)}
      className={`bg-white rounded-[1.25rem] p-5 shadow-sm border border-border/50 flex items-start gap-4 transition-all cursor-pointer active:scale-[0.98] ${
        todo.is_done ? 'opacity-60 bg-secondary/30' : 'hover:border-[#9CB4D4]/50 hover:shadow-md'
      }`}
    >
      {/* Checkbox — stopPropagation so it doesn't open the edit modal */}
      <button
        onClick={(e) => handleToggle(todo.id, todo.is_done, e)}
        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center border-2 transition-all duration-200 mt-0.5 ${
          todo.is_done
            ? 'bg-[#9CB4D4] border-[#9CB4D4] text-white scale-110'
            : 'border-muted-foreground/30 hover:border-[#9CB4D4] bg-white'
        }`}
      >
        {todo.is_done && <Check size={16} strokeWidth={3} />}
      </button>

      <div className="flex-1 min-w-0">
        <h3 className={`font-extrabold text-base leading-tight transition-all ${
          todo.is_done ? 'line-through text-muted-foreground' : 'text-foreground'
        }`}>
          {todo.title}
        </h3>

        {todo.description && !todo.is_done && (
          <p className="text-sm font-medium text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
            {todo.description}
          </p>
        )}

        {(todo.due_date || todo.due_time) && !todo.is_done && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {todo.due_date && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md bg-[#9CB4D4]/10 text-[#7A9CC6] border border-[#9CB4D4]/20">
                <Calendar size={12} strokeWidth={2.5} />
                {format(new Date(todo.due_date.length === 10 ? todo.due_date + 'T12:00:00' : todo.due_date), 'd MMM', { locale: id })}
              </span>
            )}
            {todo.due_time && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-md bg-[#9CB4D4]/10 text-[#7A9CC6] border border-[#9CB4D4]/20">
                <Clock size={12} strokeWidth={2.5} />
                {todo.due_time}
              </span>
            )}
          </div>
        )}
      </div>
    </AnimatedListItem>
  );

  return (
    <div className="flex flex-col h-full bg-background min-h-dvh pb-32 lg:pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b-0">
        <div className="px-6 py-6 pb-4 space-y-5 lg:px-10 max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-2xl font-extrabold text-foreground lg:text-3xl">To-Do List</h1>
            </div>
            <SettingsSheet avatarBg="bg-[#E1F0FF]" avatarTextColor="text-[#9CB4D4]" />
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Cari to-do..." />
        </div>
      </div>

      {/* List */}
      <div className="px-6 lg:px-10 flex-1 space-y-6 pt-2 max-w-screen-xl mx-auto w-full">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-[#9CB4D4]" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-[50vh] text-muted-foreground">
            <CheckCircle size={48} className="mb-4 text-muted-foreground/30" />
            <p className="font-medium">{search ? 'Tidak ada hasil pencarian.' : 'Semua beres! Tambah to-do baru.'}</p>
          </div>
        ) : (
          <div className="pb-8 lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
            {pendingTodos.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-4">Belum Selesai</h3>
                <AnimatePresence>
                  {pendingTodos.map(renderTodoItem)}
                </AnimatePresence>
              </div>
            )}
            {completedTodos.length > 0 && (
              <div className="space-y-3 mt-8 lg:mt-0">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1 mb-4">Selesai</h3>
                <AnimatePresence>
                  {completedTodos.map(renderTodoItem)}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Edit Modal ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isEditOpen && selectedTodo && (
          <>
            {/* Backdrop */}
            <motion.div
              key="todo-backdrop"
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setIsEditOpen(false)}
            />

            {/* Modal */}
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5 pointer-events-none">
              <motion.div
                key="todo-modal"
                className="w-full max-w-sm pointer-events-auto"
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* Card */}
                <div className="bg-[#E1F0FF] rounded-[24px] overflow-hidden shadow-2xl">
                  <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="flex flex-col">
                    {/* Header row */}
                    <div className="flex items-center justify-between px-6 pt-6 pb-3">
                      <button
                        type="button"
                        onClick={() => setIsEditOpen(false)}
                        className="text-sm font-bold text-[#7A9CC6] hover:text-[#5A7CA6] transition-colors"
                      >
                        Batal
                      </button>
                      <span className="text-[10px] font-bold text-[#7A9CC6] uppercase tracking-widest">Edit To-Do</span>
                      <button
                        type="submit"
                        className="text-sm font-bold text-[#3D6B96] bg-white/70 hover:bg-white/90 px-4 py-1.5 rounded-full transition-colors shadow-sm"
                      >
                        Simpan
                      </button>
                    </div>

                    {/* Fields */}
                    <div className="px-6 pb-5 space-y-4 max-h-[60vh] overflow-y-auto">
                      {/* Title */}
                      <input
                        {...editForm.register('title')}
                        placeholder="Apa yang harus dikerjakan?"
                        className="w-full text-xl font-extrabold bg-transparent border-b-2 border-[#9CB4D4]/40 pb-2.5 outline-none focus:border-[#9CB4D4] transition-colors placeholder:text-[#9CB4D4]/50 text-[#2A4A6A]"
                      />
                      {editForm.formState.errors.title && (
                        <p className="text-red-500 text-xs font-bold -mt-1">{editForm.formState.errors.title.message}</p>
                      )}

                      {/* Description */}
                      <textarea
                        {...editForm.register('description')}
                        placeholder="Catatan tambahan (opsional)"
                        className="w-full h-20 resize-none bg-white/60 border border-[#9CB4D4]/30 rounded-xl p-3 outline-none text-sm font-medium placeholder:text-[#9CB4D4]/60 text-[#2A4A6A] focus:border-[#9CB4D4] focus:ring-2 focus:ring-[#9CB4D4]/20 transition-all"
                      />

                      {/* Date + Time */}
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-[#7A9CC6] uppercase tracking-widest mb-1.5 block">Tanggal</label>
                          <input
                            {...editForm.register('due_date')}
                            type="date"
                            className="w-full bg-white/60 border border-[#9CB4D4]/30 rounded-xl py-2.5 px-3 outline-none focus:border-[#9CB4D4] text-sm font-bold text-[#2A4A6A] transition-all"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] font-bold text-[#7A9CC6] uppercase tracking-widest mb-1.5 block">Waktu</label>
                          <input
                            {...editForm.register('due_time')}
                            type="time"
                            className="w-full bg-white/60 border border-[#9CB4D4]/30 rounded-xl py-2.5 px-3 outline-none focus:border-[#9CB4D4] text-sm font-bold text-[#2A4A6A] transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delete row */}
                    <div className="border-t border-[#9CB4D4]/20 px-6 py-4">
                      <button
                        type="button"
                        onClick={() => handleDelete(selectedTodo.id)}
                        disabled={deletingId === selectedTodo.id}
                        className="w-full flex items-center justify-center gap-2 text-red-500 font-bold text-sm py-2 rounded-2xl bg-red-50/70 hover:bg-red-100/80 transition-colors disabled:opacity-70"
                      >
                        {deletingId === selectedTodo.id ? (
                          <>
                            <Loader2 size={15} className="animate-spin" /> Menghapus...
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

                {/* Close pill */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => setIsEditOpen(false)}
                    className="flex items-center gap-2 bg-white/90 text-gray-700 font-bold px-6 py-3 rounded-full shadow-lg hover:bg-white transition-colors text-sm"
                  >
                    <X size={16} strokeWidth={2.5} />
                    Tutup
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── New-Todo Drawer (from bottom sheet) ───────────────────────────── */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-[90vh] z-50 outline-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-6 mt-4" />
            <form onSubmit={newForm.handleSubmit(onSubmitNew)} className="flex flex-col px-6 pb-8 overflow-y-auto">
              <h3 className="font-extrabold text-2xl mb-6 text-foreground">To-Do Baru</h3>
              <div className="space-y-5 mb-8">
                <div>
                  <input
                    {...newForm.register('title')}
                    placeholder="Apa yang harus dikerjakan?"
                    className="w-full text-xl font-extrabold bg-transparent border-b-2 border-border py-3 outline-none focus:border-[#9CB4D4] transition-colors placeholder:text-muted-foreground/40 text-foreground"
                  />
                  {newForm.formState.errors.title && (
                    <p className="text-destructive font-medium text-sm mt-2">{newForm.formState.errors.title.message}</p>
                  )}
                </div>
                <textarea
                  {...newForm.register('description')}
                  placeholder="Catatan tambahan (opsional)"
                  className="w-full h-24 resize-none bg-white border border-border rounded-xl p-4 outline-none text-sm font-medium placeholder:text-muted-foreground/50 focus:border-[#9CB4D4] focus:ring-2 focus:ring-[#9CB4D4]/20 transition-all"
                />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Tanggal</label>
                    <input {...newForm.register('due_date')} type="date" className={INP} />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Waktu</label>
                    <input {...newForm.register('due_time')} type="time" className={INP} />
                  </div>
                </div>
              </div>
              <button type="submit"
                className="w-full bg-[#9CB4D4] text-white font-bold text-lg py-4 rounded-[1.25rem] shadow-sm hover:bg-[#8AA8CF] transition-colors mt-auto"
              >
                Simpan To-Do
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
