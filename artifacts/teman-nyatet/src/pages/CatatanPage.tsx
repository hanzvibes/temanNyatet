import React, { useState, useMemo, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useNotes } from '@/hooks/useNotes';
import { useCreate } from '@/contexts/CreateContext';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Loader2, BookOpen, Plus, Sparkles, X, CreditCard, ArrowUpRight, Check } from 'lucide-react';
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
import { toast } from 'sonner';
import { getNoteColor, NOTE_COLORS, NOTE_COLOR_PALETTE } from '@/lib/noteColors';
import { apiGet, apiPost } from '@/lib/apiClient';
import { formatNoteDate } from '@/lib/noteData';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ─── Palette ─────────────────────────────────────────────────────────────────
const PALETTE = NOTE_COLOR_PALETTE;
const AVAILABLE_TAGS = NOTE_TAGS;

// ─── Schema ───────────────────────────────────────────────────────────────────
const noteSchema = z.object({
  title:   z.string().optional(),
  content: z.string().min(1, 'Konten tidak boleh kosong'),
  tags:    z.array(z.string()).default([]),
  color:   z.string().optional(),
});

type NoteFormValues = z.infer<typeof noteSchema>;

// ─── NoteColorPicker ─────────────────────────────────────────────────────────
function NoteColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div>
      <label className="text-pill-label mb-3 block opacity-70">Warna Catatan</label>
      <div className="flex gap-2.5">
        {NOTE_COLORS.map(({ value: colorVal, label }) => {
          const isSelected = value === colorVal;
          return (
            <button
              key={colorVal}
              type="button"
              aria-label={`Warna ${label}${isSelected ? ', dipilih' : ''}`}
              aria-pressed={isSelected}
              onClick={() => onChange(colorVal)}
              className={[
                'h-10 w-10 min-h-[44px] min-w-[44px] rounded-full border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected
                  ? 'ring-2 ring-foreground/55 ring-offset-2 scale-[1.12]'
                  : 'hover:scale-[1.06]',
              ].join(' ')}
              style={{
                backgroundColor: colorVal,
                borderColor: `color-mix(in srgb, ${getNoteColor(colorVal).border} 80%, transparent)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function CatatanPage() {
  const { user } = useAuthContext();
  const { notes, loading, createNote, updateNote, deleteNote, reorderNotes } =
    useNotes(user?.id);
  const { pendingCreate, clearCreate } = useCreate();
  const [search, setSearch] = useState('');

  const [selectedNote, setSelectedNote]         = useState<Note | null>(null);
  const [selectedNoteColor, setSelectedNoteColor] = useState<string>(PALETTE[0]);
  const [isDetailOpen, setIsDetailOpen]         = useState(false);
  const [isEditing, setIsEditing]               = useState(false);
  const [isFormOpen, setIsFormOpen]             = useState(false);
  const [deletingId, setDeletingId]             = useState<string | null>(null);
  const [summary, setSummary]                   = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing]       = useState(false);
  const [summaryError, setSummaryError]         = useState<string | null>(null);
  const [creditBalance, setCreditBalance]       = useState<number | null>(null);
  const [creditsExhaustedOpen, setCreditsExhaustedOpen] = useState(false);
  const [openSubscriptionAfterClose, setOpenSubscriptionAfterClose] = useState(false);
  const creditState =
    creditBalance === null ? 'loading' : creditBalance <= 0 ? 'empty' : creditBalance <= 2 ? 'low' : 'healthy';

  const form = useForm<NoteFormValues>({
    resolver: zodResolver(noteSchema),
    defaultValues: { title: '', content: '', tags: [], color: '' },
  });

  const formColor = form.watch('color');

  const filteredNotes = useMemo(() => {
    if (!search) return notes;
    const lower = search.toLowerCase();
    return notes.filter(
      (n) =>
        (n.title?.toLowerCase().includes(lower)) ||
        n.content.toLowerCase().includes(lower),
    );
  }, [notes, search]);

  useEffect(() => {
    if (pendingCreate === 'note') {
      handleOpenForm();
      clearCreate();
    }
  }, [pendingCreate]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDetailOpen) setIsDetailOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isDetailOpen]);

  useEffect(() => {
    if (!user) return;
    apiGet<{ balance: number }>('/credits')
      .then(({ balance }) => setCreditBalance(balance))
      .catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (creditsExhaustedOpen || !openSubscriptionAfterClose) return;

    // Let Radix finish the dialog's close animation before mounting the
    // settings drawer. This keeps both portals from briefly stacking.
    const timer = window.setTimeout(() => {
      setOpenSubscriptionAfterClose(false);
      window.dispatchEvent(
        new CustomEvent('teman-nyatet:open-settings-subscription', { cancelable: true }),
      );
    }, 260);

    return () => window.clearTimeout(timer);
  }, [creditsExhaustedOpen, openSubscriptionAfterClose]);

  const handleOpenDetail = (note: Note, color: string) => {
    setSelectedNote(note);
    setSelectedNoteColor(color);
    setSummary(null);
    setSummaryError(null);
    setIsEditing(false);
    setIsDetailOpen(true);
  };

  const handleSummarize = async () => {
    if (!selectedNote || !selectedNote.content.trim()) return;
    if (creditBalance === 0) {
      setCreditsExhaustedOpen(true);
      return;
    }
    setIsSummarizing(true);
    setSummaryError(null);
    try {
      const response = await apiPost<{ summary: string; balance: number }>(
        `/notes/${encodeURIComponent(selectedNote.id)}/summarize`,
        {},
      );
      setSummary(response.summary);
      setCreditBalance(response.balance);
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(12);
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'CREDITS_EXHAUSTED') {
        setCreditBalance(0);
        setCreditsExhaustedOpen(true);
        return;
      }
      setSummaryError('Ringkasan belum berhasil dibuat. Coba lagi.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleStartEdit = (note: Note) => {
    form.reset({
      title:   note.title || '',
      content: note.content,
      tags:    note.tags || [],
      color:   selectedNoteColor,
    });
    setIsEditing(true);
  };

  const handleOpenForm = (note?: Note) => {
    if (note) {
      form.reset({
        title:   note.title || '',
        content: note.content,
        tags:    note.tags || [],
        color:   note.color || '',
      });
      setSelectedNote(note);
    } else {
      form.reset({ title: '', content: '', tags: [], color: '' });
      setSelectedNote(null);
    }
    setIsFormOpen(true);
    setIsDetailOpen(false);
  };

  const onSubmitForm = async (data: NoteFormValues) => {
    try {
      if (selectedNote) {
        await updateNote(selectedNote.id, {
          title:   data.title,
          content: data.content,
          tags:    data.tags,
          color:   data.color || null,
        });
        setSelectedNote((prev) =>
          prev
            ? { ...prev, title: data.title || null, content: data.content, tags: data.tags, color: data.color || null }
            : prev,
        );
        setIsEditing(false);
      } else {
        await createNote({
          title:   data.title,
          content: data.content,
          tags:    data.tags,
          color:   data.color || null,
        });
        setIsFormOpen(false);
      }
    } catch {
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

  const handleDeleteFromDrag = async (noteId: string) => {
    const deletedNote = notes.find((n) => n.id === noteId);
    if (!deletedNote) return;
    await deleteNote(noteId);
    toast('Catatan dihapus', {
      description: deletedNote.title || 'Catatan tanpa judul',
      action: {
        label: 'Urungkan',
        onClick: async () => {
          await createNote({
            title:   deletedNote.title || undefined,
            content: deletedNote.content,
            tags:    deletedNote.tags,
            color:   deletedNote.color,
          });
        },
      },
      duration: 5000,
    });
  };

  const closeDetail = () => {
    setIsDetailOpen(false);
    setIsEditing(false);
    setSummary(null);
    setSummaryError(null);
  };

  return (
    <div className="flex min-h-dvh h-full flex-col bg-background pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-16">

      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/40">
        <div className="mx-auto max-w-screen-xl px-5 py-3 sm:px-6 sm:py-4 lg:px-10 lg:py-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-pill-label mb-1 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-page-title">Catatan</h1>
            </div>
            <SettingsSheet
              avatarBg="bg-primary/10"
              avatarTextColor="text-primary"
            />
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="mx-auto w-full max-w-screen-xl px-5 pt-4 pb-6 sm:px-6 sm:pt-5 lg:px-10 lg:pt-6">
        {loading ? (
          <PageLoading accent="catatan" label="Memuat catatan…" />
        ) : (
          <div className="space-y-3">

            {/* Search */}
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari catatan…"
            />

            {/* Empty state */}
            {filteredNotes.length === 0 && (
              <PageEmpty
                accent="catatan"
                icon={BookOpen}
                title={search ? 'Tidak ada hasil pencarian' : 'Belum ada catatan'}
                description={
                  search
                    ? 'Coba kata kunci lain atau hapus filter.'
                    : 'Mulai catat hal penting. Tap tombol di bawah untuk memulai.'
                }
                cta={
                  !search ? (
                    <Button
                      onClick={() => handleOpenForm()}
                      className="rounded-full px-6 py-3"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      Tambah Catatan Pertama
                    </Button>
                  ) : undefined
                }
              />
            )}

            {/* Grid */}
            {filteredNotes.length > 0 && (
              <>
                {/* Section meta */}
                <div className="flex items-center justify-between px-0.5">
                  <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                    {search ? 'Hasil Pencarian' : 'Semua Catatan'}
                  </h2>
                  <span className="text-[11px] font-semibold text-muted-foreground/60 tabular-nums">
                    {filteredNotes.length} catatan
                  </span>
                </div>

                <SortableNoteGrid
                  notes={filteredNotes}
                  onReorder={reorderNotes}
                  onClickNote={handleOpenDetail}
                  onDeleteNote={handleDeleteFromDrag}
                  disabled={!!search}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Note Detail Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {isDetailOpen && selectedNote && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeDetail}
            />

            {/* Modal */}
            <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-center px-5">
              <motion.div
                key="modal"
                className="pointer-events-auto flex w-full max-w-sm flex-col"
                initial={{ opacity: 0, scale: 0.9, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 14 }}
                transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              >
                <motion.div
                  layout
                  transition={{ layout: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
                  className="flex max-h-[72dvh] landscape:max-h-[65dvh] flex-col overflow-hidden rounded-[1.75rem] border border-border/35 shadow-elevation-3"
                  style={{
                    backgroundColor: selectedNoteColor,
                    color: getNoteColor(selectedNoteColor).foreground,
                    borderColor: getNoteColor(selectedNoteColor).border,
                  }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isEditing ? (
                      /* ── Edit mode ── */
                      <motion.form
                        key="edit-note"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                        onSubmit={form.handleSubmit(onSubmitForm)}
                        className="flex min-h-0 flex-1 flex-col overflow-hidden"
                      >
                        {/* Edit header */}
                        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5 sm:px-6">
                          <button
                            type="button"
                            onClick={() => setIsEditing(false)}
                            className="-ml-2 min-h-11 rounded-lg px-2 text-sm font-bold text-muted-foreground transition-colors hover:text-foreground"
                          >
                            Batal
                          </button>
                          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
                            Edit Catatan
                          </span>
                          <button
                            type="submit"
                            className="min-h-11 rounded-xl bg-card/65 px-4 text-sm font-bold text-foreground shadow-sm transition-colors hover:bg-card"
                          >
                            Simpan
                          </button>
                        </div>

                        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 pb-6 sm:px-6">
                          <input
                            {...form.register('title')}
                            placeholder="Judul (opsional)"
                            aria-label="Judul catatan"
                            className="w-full border-b border-current/20 bg-transparent pb-2 text-2xl font-bold outline-none placeholder:opacity-60 transition-colors focus:border-current/45"
                          />
                          <textarea
                            {...form.register('content')}
                            placeholder="Apa yang ingin kamu catat?"
                            aria-label="Isi catatan"
                            className="w-full min-h-[120px] resize-none bg-transparent text-base font-medium leading-relaxed outline-none placeholder:opacity-60"
                            autoFocus
                          />
                          {form.formState.errors.content && (
                            <FormError size="xs">
                              {form.formState.errors.content.message}
                            </FormError>
                          )}

                          {/* Tags */}
                          <div>
                            <label className="text-pill-label mb-2 block opacity-70">Tags</label>
                            <div className="flex flex-wrap gap-2">
                              {AVAILABLE_TAGS.map(({ name: tag, icon: Icon }) => {
                                const currentTags = form.watch('tags');
                                const isSel = currentTags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() =>
                                      form.setValue(
                                        'tags',
                                        isSel
                                          ? currentTags.filter((t) => t !== tag)
                                          : [...currentTags, tag],
                                      )
                                    }
                                    className={[
                                      'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition-all',
                                      isSel
                                        ? 'border-foreground/70 bg-foreground/75 text-background'
                                        : 'border-border/45 bg-muted/40 text-muted-foreground hover:bg-muted',
                                    ].join(' ')}
                                    aria-label={`Tag ${tag}${isSel ? ', dipilih' : ''}`}
                                    aria-pressed={isSel}
                                  >
                                    <Icon size={13} strokeWidth={2.4} className="shrink-0" />
                                    {tag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Colour picker */}
                          <NoteColorPicker
                            value={form.watch('color') ?? ''}
                            onChange={(color) => {
                              form.setValue('color', color);
                              setSelectedNoteColor(color);
                            }}
                          />
                        </div>
                      </motion.form>
                    ) : (
                      /* ── Read mode ── */
                      <motion.div
                        key="read-note"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
                        className="flex min-h-0 flex-1 flex-col"
                      >
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
                          {selectedNote.title && (
                            <h2 className="text-modal-title !text-foreground mb-2.5">
                              {selectedNote.title}
                            </h2>
                          )}
                          <p className="mb-4 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/75">
                            {formatNoteDate(
                              selectedNote.created_at,
                              'EEEE, d MMMM yyyy · HH:mm',
                              id,
                            )}
                          </p>
                          <p className="mb-5 text-base font-medium leading-relaxed text-foreground/90 whitespace-pre-wrap">
                            {selectedNote.content}
                          </p>

                          {/* AI summary */}
                          <AnimatePresence initial={false}>
                            {(isSummarizing || summary || summaryError) && (
                              <motion.div
                                key="ai-summary-container"
                                layout
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{
                                  height: { type: 'spring', stiffness: 340, damping: 32, mass: 0.9 },
                                  opacity: { duration: 0.18 },
                                }}
                                className="overflow-hidden"
                              >
                                <div className="mb-5 mt-0.5 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-card/50 to-card/50 p-4">
                                  <div className="mb-2.5 flex items-center gap-2 text-sm font-bold text-foreground">
                                    <motion.div
                                      animate={
                                        isSummarizing
                                          ? { rotate: 360, scale: [1, 1.12, 1] }
                                          : { rotate: 0, scale: 1 }
                                      }
                                      transition={
                                        isSummarizing
                                          ? {
                                              rotate: { duration: 1.6, repeat: Infinity, ease: 'linear' },
                                              scale: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
                                            }
                                          : { type: 'spring', stiffness: 500, damping: 15 }
                                      }
                                      className="text-primary"
                                    >
                                      <Sparkles size={14} />
                                    </motion.div>
                                    <span>Ringkasan AI</span>
                                  </div>

                                  <AnimatePresence mode="wait" initial={false}>
                                    {isSummarizing ? (
                                      <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.15 }}
                                        className="space-y-2 py-0.5"
                                        aria-live="polite"
                                        aria-label="Sedang membuat ringkasan"
                                      >
                                        {[100, 88, 64].map((w, i) => (
                                          <motion.div
                                            key={i}
                                            className="h-3 rounded-full bg-foreground/10"
                                            style={{ width: `${w}%` }}
                                            animate={{ opacity: [0.35, 0.8, 0.35] }}
                                            transition={{
                                              duration: 1.1,
                                              repeat: Infinity,
                                              delay: i * 0.15,
                                              ease: 'easeInOut',
                                            }}
                                          />
                                        ))}
                                      </motion.div>
                                    ) : summary ? (
                                      <motion.p
                                        key="result"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.04, ease: [0.32, 0.72, 0, 1] }}
                                        className="text-sm leading-relaxed text-foreground/85"
                                      >
                                        {summary}
                                      </motion.p>
                                    ) : (
                                      <motion.p
                                        key="error"
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ duration: 0.3, delay: 0.04 }}
                                        className="text-sm leading-relaxed text-destructive"
                                      >
                                        {summaryError}
                                      </motion.p>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Tags */}
                          {selectedNote.tags && selectedNote.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {selectedNote.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full border border-border/45 bg-muted/40 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-foreground/80"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Action bar */}
                        <div className="flex shrink-0 gap-2.5 border-t border-border/35 px-5 pb-5 pt-3.5 sm:px-6">
                          {/* Summarize */}
                          <button
                            onClick={handleSummarize}
                            disabled={isSummarizing || !selectedNote.content.trim()}
                            className={[
                              'group flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-bold shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-px active:scale-[0.98] disabled:translate-y-0 disabled:opacity-55',
                              creditState === 'empty'
                                ? 'bg-muted text-muted-foreground'
                                : creditState === 'low'
                                  ? 'bg-orange-500/10 text-orange-700 hover:bg-orange-500/15 dark:text-orange-300'
                                  : 'bg-primary/8 text-primary hover:bg-primary/14',
                            ].join(' ')}
                            aria-label="Ringkas catatan dengan AI"
                          >
                            {isSummarizing ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <Sparkles size={15} />
                            )}
                            {isSummarizing ? 'Merangkum…' : 'Ringkas AI'}
                            {creditState === 'loading' ? (
                              <span
                                aria-label="Memuat saldo credit"
                                className="ml-1 h-4 w-5 animate-pulse rounded-md bg-current/15"
                              />
                            ) : (
                              <span className={[
                                'ml-0.5 inline-flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[10px] font-black tabular-nums',
                                creditState === 'empty'
                                  ? 'bg-muted-foreground/15'
                                  : creditState === 'low'
                                    ? 'bg-orange-500/15'
                                    : 'bg-primary/15',
                              ].join(' ')}>
                                {creditBalance}
                              </span>
                            )}
                          </button>
                          {/* Edit */}
                          <button
                            onClick={() => handleStartEdit(selectedNote)}
                            className="min-h-11 flex-1 rounded-xl bg-card/65 text-sm font-bold text-foreground shadow-sm transition-all hover:bg-card active:scale-[0.98]"
                          >
                            Edit
                          </button>
                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(selectedNote.id)}
                            disabled={deletingId === selectedNote.id}
                            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-destructive/8 text-sm font-bold text-destructive shadow-sm transition-all hover:bg-destructive/14 active:scale-[0.98] disabled:opacity-60"
                          >
                            {deletingId === selectedNote.id ? (
                              <Loader2 size={15} className="animate-spin" />
                            ) : (
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                              </svg>
                            )}
                            {deletingId === selectedNote.id ? 'Menghapus…' : 'Hapus'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Close pill */}
                <div className="mt-3.5 flex justify-center">
                  <button
                    onClick={closeDetail}
                    className="flex min-h-11 items-center gap-2 rounded-full border border-border/50 bg-card/80 px-5 py-2.5 text-sm font-bold text-foreground shadow-elevation-1 backdrop-blur-sm transition-all hover:bg-card"
                  >
                    <X size={14} strokeWidth={2.5} />
                    Tutup
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── Create / Edit Form Sheet ──────────────────────────────────────── */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
          <Drawer.Content
            className="fixed bottom-0 left-0 right-0 z-50 flex max-h-sheet h-[90dvh] landscape:h-[75dvh] flex-col overflow-hidden rounded-t-[1.75rem] border-t border-border/60 shadow-elevation-3 outline-none sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2"
            style={{
              backgroundColor: formColor || 'hsl(var(--card))',
              transition: 'background-color 0.2s ease',
            }}
          >
            {/* Drag handle */}
            <div className="mx-auto mb-1 mt-3.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />

            <form
              onSubmit={form.handleSubmit(onSubmitForm)}
              className="flex flex-1 flex-col overflow-hidden px-5 sm:px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
            >
              {/* Sheet header */}
              <div className="mb-5 mt-3 flex shrink-0 items-center justify-between gap-3">
                <h3 className="min-w-0 flex-1 truncate text-section-title">
                  {selectedNote ? 'Edit Catatan' : 'Catatan Baru'}
                </h3>
                <button
                  type="submit"
                  className="min-h-11 rounded-full bg-primary/12 px-5 py-2 text-sm font-bold text-primary transition-all hover:bg-primary/20 active:scale-95"
                >
                  Simpan
                </button>
              </div>

              <div className="flex-1 space-y-5 overflow-y-auto pb-2">
                <input
                  {...form.register('title')}
                  placeholder="Judul (opsional)"
                  aria-label="Judul catatan"
                  className="w-full border-b border-border/60 bg-transparent pb-2 text-2xl font-bold text-foreground outline-none placeholder:text-muted-foreground/55 transition-colors focus:border-primary/60"
                />

                <textarea
                  {...form.register('content')}
                  placeholder="Apa yang ingin kamu catat?"
                  aria-label="Isi catatan"
                  className="w-full h-48 resize-none bg-transparent text-lg font-medium leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/55"
                  autoFocus
                />
                {form.formState.errors.content && (
                  <FormError>{form.formState.errors.content.message}</FormError>
                )}

                {/* Tags */}
                <div>
                  <label className="text-pill-label mb-3 block opacity-70">Tags</label>
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
                              form.setValue('tags', currentTags.filter((t) => t !== tag));
                            } else {
                              form.setValue('tags', [...currentTags, tag]);
                            }
                          }}
                          className={[
                            'inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full border px-4 py-2 text-sm font-bold transition-all',
                            isSelected
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                              : 'border-border/50 bg-secondary/60 text-muted-foreground hover:border-primary/50',
                          ].join(' ')}
                          aria-label={`Tag ${tag}${isSelected ? ', dipilih' : ''}`}
                          aria-pressed={isSelected}
                        >
                          <Icon size={15} strokeWidth={2.4} className="shrink-0" />
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Colour picker */}
                <NoteColorPicker
                  value={formColor ?? ''}
                  onChange={(color) => form.setValue('color', color)}
                />
              </div>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>

      <Dialog open={creditsExhaustedOpen} onOpenChange={setCreditsExhaustedOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] overflow-hidden rounded-[1.75rem] border-border/70 bg-card p-0 shadow-elevation-3 duration-300 ease-out data-[state=open]:zoom-in-[0.98] data-[state=open]:slide-in-from-top-[46%] data-[state=closed]:zoom-out-[0.98] sm:max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={
              creditsExhaustedOpen
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 5 }
            }
            transition={{
              duration: creditsExhaustedOpen ? 0.28 : 0.2,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="p-6 sm:p-7"
          >
                <DialogHeader>
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/8 text-primary">
                    <CreditCard size={24} strokeWidth={2.1} />
                  </div>
                  <p className="mb-2 text-center text-[0.68rem] font-black uppercase tracking-[0.2em] text-primary">
                    Ringkas AI
                  </p>
                  <DialogTitle className="text-center text-xl font-black tracking-tight">
                    Semua credit sudah dipakai
                  </DialogTitle>
                  <DialogDescription className="mx-auto mt-2 max-w-xs text-center leading-relaxed">
                    Catatanmu tetap aman. Tambahkan credit saat ingin membuat ringkasan berikutnya.
                  </DialogDescription>
                </DialogHeader>

                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{
                    opacity: creditsExhaustedOpen ? 1 : 0,
                    scale: creditsExhaustedOpen ? 1 : 0.985,
                  }}
                  transition={{
                    delay: creditsExhaustedOpen ? 0.08 : 0,
                    duration: creditsExhaustedOpen ? 0.2 : 0.16,
                  }}
                  className="mt-6 flex items-center gap-3 rounded-2xl border border-border/70 bg-secondary/45 px-4 py-3.5"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Check size={16} strokeWidth={2.8} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Saldo saat ini</p>
                    <p className="mt-0.5 text-base font-black tabular-nums text-foreground">0 credit</p>
                  </div>
                </motion.div>

                <DialogFooter className="mt-5 gap-2 sm:flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenSubscriptionAfterClose(true);
                      setCreditsExhaustedOpen(false);
                    }}
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 font-bold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md active:translate-y-px active:scale-[0.98]"
                  >
                    Lihat opsi top-up <ArrowUpRight size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreditsExhaustedOpen(false)}
                    className="min-h-11 w-full rounded-xl px-4 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    Nanti saja
                  </button>
                </DialogFooter>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
