import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { SwipeableRow } from '@/components/SwipeableRow';
import SettingsSheet from '@/components/SettingsSheet';
import { useLinks } from '@/hooks/useLinks';
import { useCreate } from '@/contexts/CreateContext';
import {
  Link2,
  Copy,
  ExternalLink,
  Plus,
  Check,
  PanelTopOpen,
} from 'lucide-react';
import { FormError, PageEmpty, PageLoading } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/SearchBar';
import { Drawer } from 'vaul';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

// ─── Schema ───────────────────────────────────────────────────────────────────
const linkSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  url:   z.string().url('URL tidak valid'),
  note:  z.string().optional(),
});

type LinkFormValues = z.infer<typeof linkSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function extractDomain(url: string): string | null {
  try {
    return new URL(url.startsWith('http') ? url : 'https://' + url).hostname;
  } catch {
    return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LinkSaverPage() {
  const { user } = useAuthContext();
  const { links, loading, createLink, deleteLink } = useLinks(user?.id);
  const { pendingCreate, clearCreate } = useCreate();

  const [search, setSearch]       = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId]   = useState<string | null>(null);

  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: { title: '', url: '', note: '' },
  });

  useEffect(() => {
    if (pendingCreate === 'link') {
      form.reset();
      setIsFormOpen(true);
      clearCreate();
    }
  }, [pendingCreate]);

  const filteredLinks = useMemo(() => {
    if (!search) return links;
    const lower = search.toLowerCase();
    return links.filter(
      (l) =>
        l.title.toLowerCase().includes(lower) ||
        l.url.toLowerCase().includes(lower),
    );
  }, [links, search]);

  const onSubmitForm = async (data: LinkFormValues) => {
    try {
      let finalUrl = data.url;
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        finalUrl = 'https://' + finalUrl;
      }
      await createLink({ title: data.title, url: finalUrl, note: data.note || null });
      setIsFormOpen(false);
      form.reset();
    } catch {
      toast.error('Gagal menyimpan link. Coba lagi.');
    }
  };

  const copyToClipboard = useCallback(
    (e: React.MouseEvent, id: string, url: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast.success('URL disalin!');
      setTimeout(() => setCopiedId(null), 1200);
    },
    [],
  );

  const openLink = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const handleSwipeDelete = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await deleteLink(id);
      } finally {
        setDeletingId(null);
      }
    },
    [deleteLink],
  );

  const handleOpenForm = useCallback(() => {
    form.reset();
    setIsFormOpen(true);
  }, [form]);

  const openCreateAction = useCallback(() => {
    if (window.matchMedia('(min-width: 1024px)').matches) {
      handleOpenForm();
      return;
    }
    window.dispatchEvent(new Event('teman-nyatet:open-bottom-sheet'));
  }, [handleOpenForm]);

  return (
    <div className="app-page">

      {/* ── Header ── */}
      <div className="app-page-header">
        <div className="app-page-header-inner">
            <div>
              <div className="text-pill-label mb-1 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-page-title">Link Saver</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-linksaver/30 text-linksaver-text transition-colors hover:bg-linksaver/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linksaver focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                onClick={() => window.dispatchEvent(new Event('teman-nyatet:open-bottom-sheet'))}
                aria-label="Buka menu tambah link"
              >
                <PanelTopOpen size={18} strokeWidth={2.3} />
              </button>
              <SettingsSheet
                avatarBg="bg-linksaver/15"
                avatarTextColor="text-linksaver-text"
                viewport="mobile"
              />
            </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="app-page-body">
        {loading ? (
          <PageLoading accent="link" label="Memuat link…" />
        ) : (
          <div className="space-y-3">

            {/* Search */}
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Cari link…"
            />

            {/* Empty state */}
            {filteredLinks.length === 0 && (
              <PageEmpty
                accent="link"
                icon={Link2}
                title={search ? 'Tidak ada hasil pencarian' : 'Belum ada link tersimpan'}
                description={
                  search
                    ? 'Coba kata kunci lain atau hapus filter.'
                    : 'Simpan link penting agar mudah ditemukan kapan saja.'
                }
                cta={
                  !search ? (
                    <Button
                      onClick={openCreateAction}
                      className="rounded-full bg-linksaver px-6 py-3 text-white hover:bg-linksaver/90"
                    >
                      <Plus size={16} strokeWidth={2.5} />
                      Simpan Link Pertama
                    </Button>
                  ) : undefined
                }
              />
            )}

            {/* Link grid */}
            {filteredLinks.length > 0 && (
              <>
                {/* Section meta */}
                <div className="app-section-meta">
                  <h2>
                    Link Tersimpan
                  </h2>
                  <span>
                    {filteredLinks.length} link
                  </span>
                </div>

                <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence mode="popLayout">
                    {filteredLinks.map((link) => {
                      const domain = extractDomain(link.url);

                      return (
                        <motion.div
                          key={link.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{
                            duration: 0.22,
                            ease: [0.25, 0.1, 0.25, 1],
                            layout: { duration: 0.2 },
                          }}
                        >
                          <SwipeableRow
                            id={link.id}
                            isDeleting={deletingId === link.id}
                            onDelete={handleSwipeDelete}
                            accentColor="linksaver"
                          >
                            <div
                              onClick={() => openLink(link.url)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  openLink(link.url);
                                }
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={`Buka link: ${link.title}. Geser ke kiri untuk hapus.`}
                              className="flex cursor-pointer select-none items-center gap-3.5 rounded-2xl border border-border/55 bg-card p-4 transition-all hover:border-linksaver/35 hover:shadow-elevation-1 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linksaver focus-visible:ring-offset-2"
                            >
                              {/* Favicon */}
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[0.875rem] border border-border/60 bg-secondary">
                                {domain ? (
                                  <img
                                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                                    alt=""
                                    className="h-6 w-6 object-contain"
                                    loading="lazy"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <Link2 size={16} strokeWidth={2} className="text-muted-foreground/45" />
                                )}
                              </div>

                              {/* Content */}
                              <div className="min-w-0 flex-1 space-y-0.5">
                                <h3 className="line-clamp-1 text-[13.5px] font-semibold leading-snug text-foreground">
                                  {link.title}
                                </h3>
                                <div className="flex min-w-0 items-center gap-1.5">
                                  {domain && (
                                    <span className="truncate text-[11px] font-medium text-muted-foreground/65">
                                      {domain}
                                    </span>
                                  )}
                                  {link.note && domain && (
                                    <span className="shrink-0 text-[10px] text-muted-foreground/30">·</span>
                                  )}
                                  {link.note && (
                                    <span className="truncate text-[11px] font-medium text-muted-foreground/55">
                                      {link.note}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Copy button */}
                              <button
                                type="button"
                                aria-label={copiedId === link.id ? 'Tersalin' : `Salin URL ${link.title}`}
                                onClick={(e) => copyToClipboard(e, link.id, link.url)}
                                className="flex h-10 w-10 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-border/50 bg-muted/40 transition-all hover:border-linksaver/30 hover:bg-linksaver/8 hover:text-linksaver focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linksaver focus-visible:ring-offset-2"
                              >
                                {copiedId === link.id ? (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                                  >
                                    <Check size={14} strokeWidth={2.8} className="text-linksaver" />
                                  </motion.div>
                                ) : (
                                  <Copy size={14} strokeWidth={2.2} className="text-muted-foreground/55" />
                                )}
                              </button>
                            </div>
                          </SwipeableRow>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Form Sheet ── */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 flex max-h-sheet h-[90dvh] landscape:h-[75dvh] flex-col overflow-hidden rounded-t-[1.75rem] border-t border-border/60 bg-card shadow-elevation-3 outline-none sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2">
            {/* Drag handle */}
            <div className="mx-auto mb-1 mt-3.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />

            <form
              onSubmit={form.handleSubmit(onSubmitForm)}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6"
            >
              <h3 className="text-modal-title mb-6 mt-3">Simpan Link Baru</h3>

              <div className="space-y-5 mb-6">
                {/* Title */}
                <div>
                  <label className="text-pill-label mb-2.5 block">Judul</label>
                  <input
                    {...form.register('title')}
                    placeholder="Contoh: Artikel React"
                    className="w-full rounded-xl border border-border/60 bg-background px-4 py-3.5 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-linksaver focus:ring-2 focus:ring-linksaver/20"
                    autoFocus
                  />
                  {form.formState.errors.title && (
                    <FormError className="mt-2 ml-1" size="xs">
                      {form.formState.errors.title.message as string}
                    </FormError>
                  )}
                </div>

                {/* URL */}
                <div>
                  <label className="text-pill-label mb-2.5 block">URL Link</label>
                  <div className="relative">
                    <ExternalLink
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/40"
                      size={16}
                      strokeWidth={2}
                    />
                    <input
                      {...form.register('url')}
                      type="url"
                      placeholder="https://…"
                      className="w-full rounded-xl border border-border/60 bg-background py-3.5 pl-10 pr-4 text-sm font-semibold text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-linksaver focus:ring-2 focus:ring-linksaver/20"
                    />
                  </div>
                  {form.formState.errors.url && (
                    <FormError className="mt-2 ml-1" size="xs">
                      {form.formState.errors.url.message as string}
                    </FormError>
                  )}
                </div>

                {/* Note */}
                <div>
                  <label className="text-pill-label mb-2.5 block">
                    Catatan <span className="normal-case tracking-normal font-medium opacity-60">(opsional)</span>
                  </label>
                  <textarea
                    {...form.register('note')}
                    placeholder="Kenapa link ini disimpan?"
                    aria-label="Catatan tambahan"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border/60 bg-background px-4 py-3.5 text-sm font-medium text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-linksaver focus:ring-2 focus:ring-linksaver/20"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="min-h-[3.25rem] w-full rounded-[1rem] bg-linksaver py-3.5 text-[15px] font-bold text-white hover:bg-linksaver/90 disabled:opacity-55 transition-all"
              >
                Simpan Link
              </Button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
