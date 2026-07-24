import React, { useState, useMemo, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import { useCreate } from '@/contexts/CreateContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, BookOpen, Trash2, X } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { FormError, PageEmpty, PageLoading } from '@/components/PageStates';
import { NOTE_TAGS } from '@/lib/categoryIcons';
import SearchBar from '@/components/SearchBar';
import SettingsSheet from '@/components/SettingsSheet';
import { Drawer } from 'vaul';
import { Note } from '@/lib/database.types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { SortableNoteGrid } from '@/components/SortableNoteGrid';

const PALETTE = ['#FFF8D6', '#E8F2DF', '#FFE4E1', '#E1F0FF'];
const AVAILABLE_TAGS = NOTE_TAGS;

const noteSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1, 'Konten tidak boleh kosong'),
  tags: z.array(z.string()).default([]),
});

type NoteFormValues = z.infer<typeof noteSchema>;

export default function CatatanPage() {
  const { user } = useAuthContext();
  const { notes, loading, createNote, updateNote, deleteNote, reorderNotes } = useNotes(user?.id);
  const { pendingCreate, clearCreate } = useCreate();
  const [search, setSearch] = useState('');

  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [selectedNoteColor, setSelectedNoteColor] = useState<string>(PALETTE[0]);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', content: '', tags: [] },
  });

  const filteredNotes = useMemo(() => {
    if (!search) return notes;
    const lower = search.toLowerCase();
    return notes.filter(n =>
      (n.title?.toLowerCase().includes(lower)) ||
      (n.content.toLowerCase().includes(lower))
    );
  }, [notes, search]);

  // Open new note form when triggered from DraggableSheet
  useEffect(() => {
    if (pendingCreate === 'note') {
      handleOpenForm();
      clearCreate();
    }
  }, [pendingCreate]);

  // Escape key to close detail modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDetailOpen) setIsDetailOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDetailOpen]);

  const handleOpenDetail = (note: Note, color: string) => {
    setSelectedNote(note);
    setSelectedNoteColor(color);
    setIsEditing(false);
    setIsDetailOpen(true);
  };

  const handleStartEdit = (note: Note) => {
    form.reset({
      title: note.title || '',
      content: note.content,
      tags: note.tags || [],
    });
    setIsEditing(true);
  };

  const handleOpenForm = (note?: Note) => {
    if (note) {
      form.reset({ title: note.title || '', content: note.content, tags: note.tags || [] });
      setSelectedNote(note);
    } else {
      form.reset({ title: '', content: '', tags: [] });
      setSelectedNote(null);
    }
    setIsFormOpen(true);
    setIsDetailOpen(false);
  };

  const onSubmitForm = async (data: NoteFormValues) => {
    try {
      if (selectedNote) {
        await updateNote(selectedNote.id, {
          title: data.title,
          content: data.content,
          tags: data.tags,
        });
        // Update local state so the modal reflects the saved changes
        setSelectedNote(prev => prev
          ? { ...prev, title: data.title || null, content: data.content, tags: data.tags }
          : prev
        );
        setIsEditing(false);
      } else {
        await createNote({ title: data.title, content: data.content, tags: data.tags });
        setIsFormOpen(false);
      }
    } catch (e) {
      // handled in hook
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteNote(id);
      setIsDetailOpen(false);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-dvh pb-32 lg:pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b-0">
        <div className="px-6 py-6 pb-4 space-y-5 lg:px-10 max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-pill-label mb-1 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-page-title">Catatan</h1>
            </div>
            <SettingsSheet avatarBg="bg-[#E8F2DF] dark:bg-[#1F2D1A]" avatarTextColor="text-primary" />
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Cari catatan..." />
        </div>
      </div>

      {/* Content */}
      <div className="px-6 lg:px-10 flex-1 pt-2 max-w-screen-xl mx-auto w-full">
        {loading ? (
          <PageLoading accent="catatan" label="Memuat catatan…" />
        ) : filteredNotes.length === 0 ? (
          <PageEmpty
            accent="catatan"
            icon={BookOpen}
            title={search ? 'Tidak ada hasil pencarian' : 'Belum ada catatan'}
            description={search ? 'Coba kata kunci lain atau hapus filter.' : 'Tarik handle di bawah untuk menambah catatan pertama.'}
          />
        ) : (
          <SortableNoteGrid
            notes={filteredNotes}
            onReorder={reorderNotes}
            onClickNote={handleOpenDetail}
            disabled={!!search}
          />
        )}
      </div>

      {/* Note Detail Modal */}
      <AnimatePresence>
        {isDetailOpen && selectedNote && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[3px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setIsDetailOpen(false)}
            />

            {/* Modal card */}
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-5 pointer-events-none">
              <motion.div
                key="modal"
                className="w-full max-w-sm flex flex-col pointer-events-auto"
                style={{ maxHeight: '80vh' }}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              >
                {/* Card */}
                <div
                  className="rounded-[24px] overflow-hidden shadow-2xl flex flex-col"
                  style={{ backgroundColor: selectedNoteColor, maxHeight: '72vh' }}
                >
                  {isEditing ? (
                    /* ── Edit mode ── */
                    <form onSubmit={form.handleSubmit(onSubmitForm)} className="flex flex-col flex-1 overflow-hidden">
                      {/* Edit header */}
                      <div className="flex items-center justify-between px-7 pt-6 pb-3 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                        >
                          Batal
                        </button>
                        <span className="text-pill-label !text-gray-500">Edit Catatan</span>
                        <button
                          type="submit"
                          className="text-sm font-bold text-gray-800 bg-white/70 hover:bg-white/90 px-4 py-1.5 rounded-full transition-colors shadow-sm"
                        >
                          Simpan
                        </button>
                      </div>

                      {/* Edit fields */}
                      <div className="flex-1 overflow-y-auto px-7 pb-6 space-y-4">
                        <input
                          {...form.register('title')}
                          placeholder="Judul (opsional)"
                          className="w-full text-2xl font-extrabold bg-transparent outline-none placeholder:text-gray-400/60 text-gray-900 border-b border-black/10 pb-2"
                        />
                        <textarea
                          {...form.register('content')}
                          placeholder="Apa yang ingin kamu catat?"
                          className="w-full min-h-[120px] resize-none bg-transparent outline-none text-base font-medium placeholder:text-gray-400/60 text-gray-800 leading-relaxed"
                          autoFocus
                        />
                        {form.formState.errors.content && (
                          <FormError size="xs" className="-mt-1"><AlertCircle className="hidden" aria-hidden />{form.formState.errors.content.message}</FormError>
                        )}
                        {/* Tags */}
                        <div>
                          <label className="text-pill-tag !text-gray-500 mb-2 block">Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {AVAILABLE_TAGS.map(({ name: tag, icon: Icon }) => {
                              const currentTags = form.watch('tags');
                              const isSel = currentTags.includes(tag);
                              return (
                                <button key={tag} type="button"
                                  onClick={() => form.setValue('tags',
                                    isSel ? currentTags.filter(t => t !== tag) : [...currentTags, tag]
                                  )}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                                    isSel
                                      ? 'bg-gray-800/80 text-white border-gray-800/80'
                                      : 'bg-white/60 text-gray-600 border-white/80 hover:bg-white/80'
                                  }`}
                                ><Icon size={14} strokeWidth={2.4} className="flex-shrink-0" />{tag}</button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </form>
                  ) : (
                    /* ── Read mode ── */
                    <>
                      <div className="overflow-y-auto flex-1 p-7">
                        {selectedNote.title && (
                          <h2 className="text-modal-title !text-gray-900 mb-3">
                            {selectedNote.title}
                          </h2>
                        )}
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-5">
                          {format(new Date(selectedNote.created_at), 'EEEE, d MMMM yyyy · HH:mm', { locale: id })}
                        </p>
                        <p className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mb-6">
                          {selectedNote.content}
                        </p>
                        {selectedNote.tags && selectedNote.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {selectedNote.tags.map(tag => (
                              <span key={tag} className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-white/60 text-gray-700 border border-white/80">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 px-7 pb-6 pt-3 flex-shrink-0 border-t border-black/5">
                        <button
                          onClick={() => handleStartEdit(selectedNote)}
                          className="flex-1 bg-white/70 text-gray-800 font-bold py-3 rounded-2xl hover:bg-white/90 transition-colors text-sm shadow-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedNote.id)}
                          disabled={deletingId === selectedNote.id}
                          className="flex-1 bg-red-100/70 text-red-600 font-bold py-3 rounded-2xl hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 text-sm shadow-sm disabled:opacity-70"
                        >
                          {deletingId === selectedNote.id ? (
                            <>
                              <Loader2 size={16} className="animate-spin" /> Menghapus...
                            </>
                          ) : (
                            <>
                              <Trash2 size={16} /> Hapus
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Close button below card */}
                <div className="flex justify-center mt-4">
                  <button
                    onClick={() => { setIsDetailOpen(false); setIsEditing(false); }}
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

      {/* Form Sheet */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-[90vh] h-[90vh] z-50 outline-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-4 mt-4" />

            <form onSubmit={form.handleSubmit(onSubmitForm)} className="flex flex-col flex-1 px-6 pb-6 overflow-hidden">
              <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h3 className="text-section-title">{selectedNote ? 'Edit Catatan' : 'Catatan Baru'}</h3>
                <button type="submit" className="text-primary font-bold px-5 py-2 bg-primary/10 rounded-full hover:bg-primary/20 transition-colors">
                  Simpan
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pb-4">
                <input
                  {...form.register('title')}
                  placeholder="Judul (opsional)"
                  className="w-full text-2xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/50"
                />

                <textarea
                  {...form.register('content')}
                  placeholder="Apa yang ingin kamu catat?"
                  className="w-full h-48 resize-none bg-transparent outline-none text-lg font-medium placeholder:text-muted-foreground/50 leading-relaxed"
                  autoFocus
                />
                {form.formState.errors.content && (
                  <FormError className="">{form.formState.errors.content.message}</FormError>
                )}

                <div>
                  <label className="text-pill-label mb-3 block">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TAGS.map(({ name: tag, icon: Icon }) => {
                      const currentTags = form.watch('tags');
                      const isSelected = currentTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              form.setValue('tags', currentTags.filter(t => t !== tag));
                            } else {
                              form.setValue('tags', [...currentTags, tag]);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-bold transition-all border ${
                            isSelected
                              ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                              : 'bg-white text-muted-foreground border-border hover:border-primary/50'
                          }`}
                        >
                          <Icon size={16} strokeWidth={2.4} className="flex-shrink-0" />
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
