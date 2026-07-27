import React, { useState, useMemo, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import { useCreate } from '@/contexts/CreateContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, BookOpen, Trash2, X, Plus } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { FormError, PageEmpty, PageLoading } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
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

const PALETTE = [
  'var(--note-card-1)',
  'var(--note-card-2)',
  'var(--note-card-3)',
  'var(--note-card-4)',
];
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
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="px-5 py-5 pb-4 space-y-4 sm:px-6 lg:px-10 lg:py-7 lg:pb-5 max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-pill-label mb-1.5 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-page-title">Catatan</h1>
            </div>
            <SettingsSheet avatarBg="bg-primary/10" avatarTextColor="text-primary" />
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Cari catatan..." />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 sm:px-6 lg:px-10 flex-1 pt-5 lg:pt-7 max-w-screen-xl mx-auto w-full">
        {loading ? (
          <PageLoading accent="catatan" label="Memuat catatan…" />
        ) : filteredNotes.length === 0 ? (
          <PageEmpty
            accent="catatan"
            icon={BookOpen}
            title={search ? 'Tidak ada hasil pencarian' : 'Belum ada catatan'}
            description={search ? 'Coba kata kunci lain atau hapus filter.' : 'Mulai catat hal penting. Tap tombol di bawah untuk memulai.'}
            cta={!search ? (
              <Button
                onClick={() => handleOpenForm()}
                className="rounded-xl px-6 py-3.5"
              >
                <Plus size={18} strokeWidth={2.5} />
                Tambah Catatan Pertama
              </Button>
            ) : undefined}
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
                  className="rounded-[1.5rem] overflow-hidden shadow-elevated flex flex-col border border-border/30"
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
                          className="min-h-11 px-2 -ml-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors rounded-lg"
                        >
                          Batal
                        </button>
                        <span className="text-pill-label !text-muted-foreground">Edit Catatan</span>
                        <button
                          type="submit"
                          className="min-h-11 text-sm font-bold text-foreground bg-card/70 hover:bg-card px-4 rounded-xl transition-colors shadow-elevation-1"
                        >
                          Simpan
                        </button>
                      </div>

                      {/* Edit fields */}
                      <div className="flex-1 overflow-y-auto px-7 pb-6 space-y-4">
                        <input
                          {...form.register('title')}
                          placeholder="Judul (opsional)"
                          aria-label="Judul catatan"
                          className="w-full text-2xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/60 text-foreground border-b border-foreground/15 focus:border-foreground/40 pb-2 transition-colors"
                        />
                        <textarea
                          {...form.register('content')}
                          placeholder="Apa yang ingin kamu catat?"
                          aria-label="Isi catatan"
                          className="w-full min-h-[120px] resize-none bg-transparent outline-none text-base font-medium placeholder:text-muted-foreground/60 text-foreground leading-relaxed"
                          autoFocus
                        />
                        {form.formState.errors.content && (
                          <FormError size="xs" className="-mt-1"><AlertCircle className="hidden" aria-hidden />{form.formState.errors.content.message}</FormError>
                        )}
                        {/* Tags */}
                        <div>
                          <label className="text-pill-tag !text-muted-foreground mb-2 block">Tags</label>
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
                                      ? 'bg-foreground/80 text-background border-foreground/80'
                                      : 'bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted'
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
                      <div className="overflow-y-auto flex-1 p-5 sm:p-7">
                        {selectedNote.title && (
                          <h2 className="text-modal-title !text-foreground mb-3">
                            {selectedNote.title}
                          </h2>
                        )}
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-5">
                          {format(new Date(selectedNote.created_at), 'EEEE, d MMMM yyyy · HH:mm', { locale: id })}
                        </p>
                        <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed font-medium mb-6">
                          {selectedNote.content}
                        </p>
                        {selectedNote.tags && selectedNote.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {selectedNote.tags.map(tag => (
                              <span key={tag} className="text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-muted/50 text-foreground border border-border/50">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-3 px-5 sm:px-7 pb-6 pt-4 flex-shrink-0 border-t border-border/40">
                        <button
                          onClick={() => handleStartEdit(selectedNote)}
                          className="flex-1 min-h-11 bg-card/70 text-foreground font-bold rounded-xl hover:bg-card active:scale-[0.98] transition-all text-sm shadow-elevation-1"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(selectedNote.id)}
                          disabled={deletingId === selectedNote.id}
                          className="flex-1 min-h-11 bg-destructive/10 text-destructive font-bold rounded-xl hover:bg-destructive/15 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 text-sm shadow-elevation-1 disabled:opacity-70"
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
                  <Button
                    onClick={() => { setIsDetailOpen(false); setIsEditing(false); }}
                    variant="secondary"
                    className="rounded-full shadow-lg"
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

      {/* Form Sheet */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-[90vh] h-[90vh] sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full z-50 outline-none border-t border-border/70 shadow-elevated">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-4 mt-4" />

            <form onSubmit={form.handleSubmit(onSubmitForm)} className="flex flex-col flex-1 px-5 sm:px-6 pb-6 overflow-hidden">
              <div className="flex justify-between items-center mb-6 flex-shrink-0 gap-3">
                <h3 className="text-section-title flex-1 min-w-0 truncate">{selectedNote ? 'Edit Catatan' : 'Catatan Baru'}</h3>
                <button type="submit" className="min-h-11 text-primary font-bold px-5 py-2.5 bg-primary/10 rounded-full hover:bg-primary/20 active:scale-95 transition-all">
                  Simpan
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-5 pb-4">
                <input
                  {...form.register('title')}
                   placeholder="Judul (opsional)"
                   aria-label="Judul catatan"
                   className="w-full text-2xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/60 border-b border-border/70 focus:border-primary pb-2 transition-colors"
                />

                <textarea
                  {...form.register('content')}
                   placeholder="Apa yang ingin kamu catat?"
                   aria-label="Isi catatan"
                   className="w-full h-48 resize-none bg-transparent outline-none text-lg font-medium placeholder:text-muted-foreground/60 leading-relaxed"
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
                              : 'bg-secondary text-muted-foreground border-border hover:border-primary/50'
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
