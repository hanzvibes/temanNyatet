import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SwipeableRow } from '@/components/SwipeableRow';
import SettingsSheet from '@/components/SettingsSheet';
import { useLinks } from '@/hooks/useLinks';
import { useCreate } from '@/contexts/CreateContext';
import {
  Loader2,
  Link2,
  Copy,
  ExternalLink,
  Plus,
  Check,
} from 'lucide-react';
import { FormError, PageEmpty, PageLoading } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
import SearchBar from '@/components/SearchBar';
import { Drawer } from 'vaul';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';

const linkSchema = z.object({
  title: z.string().min(1, 'Judul wajib diisi'),
  url: z.string().url('URL tidak valid'),
  note: z.string().optional(),
});

type LinkFormValues = z.infer<typeof linkSchema>;

function extractDomain(url: string): string | null {
  try {
    return new URL(url.startsWith('http') ? url : 'https://' + url).hostname;
  } catch {
    return null;
  }
}

export default function LinkSaverPage() {
  const { user } = useAuthContext();
  const { links, loading, createLink, deleteLink } = useLinks(user?.id);
  const { pendingCreate, clearCreate } = useCreate();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const form = useForm<LinkFormValues>({
    resolver: zodResolver(linkSchema),
    defaultValues: { title: '', url: '', note: '' },
  });

  // Open new link form when triggered from DraggableSheet
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
      await createLink({
        title: data.title,
        url: finalUrl,
        note: data.note || null,
      });
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

  const handleSwipeDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteLink(id);
    } finally {
      setDeletingId(null);
    }
  }, [deleteLink]);

  const handleOpenForm = useCallback(() => {
    form.reset();
    setIsFormOpen(true);
  }, [form]);

  return (
    <div className="flex flex-col h-full bg-background min-h-dvh pb-32 lg:pb-16">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="px-5 py-5 pb-4 space-y-4 sm:px-6 lg:px-10 lg:py-7 lg:pb-5 max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 lg:hidden">
                TEMAN NYATET
              </div>
              <h1 className="text-page-title">Link Saver</h1>
            </div>
            <SettingsSheet
              avatarBg="bg-linksaver/15"
              avatarTextColor="text-linksaver-text"
            />
          </div>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Cari link..."
          />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 sm:px-6 lg:px-10 flex-1 max-w-screen-xl mx-auto w-full">
        {loading ? (
          <div className="pt-5 lg:pt-7">
            <PageLoading accent="link" label="Memuat link…" />
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="pt-5 lg:pt-7">
            <PageEmpty
              accent="link"
              icon={Link2}
              title={
                search
                  ? 'Tidak ada hasil pencarian'
                  : 'Belum ada link tersimpan'
              }
              description={
                search
                  ? 'Coba kata kunci lain atau hapus filter.'
                  : 'Simpan link penting agar mudah ditemukan kapan saja.'
              }
              cta={
                !search ? (
                  <Button
                    onClick={handleOpenForm}
                    className="bg-linksaver text-white hover:bg-linksaver/90 rounded-full px-6 py-3.5"
                  >
                    <Plus size={18} strokeWidth={2.5} />
                    Simpan Link Pertama
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="pt-5 pb-8 lg:pt-7">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredLinks.map((link) => {
                  const domain = extractDomain(link.url);

                  return (
                    <motion.div
                      key={link.id}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.94 }}
                      transition={{
                        duration: 0.25,
                        ease: [0.25, 0.1, 0.25, 1],
                        layout: { duration: 0.22 },
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
                          className="relative bg-card rounded-[1.25rem] p-4 border border-card-border flex items-center gap-3.5 cursor-pointer hover:border-linksaver/40 hover:shadow-md transition-all active:scale-[0.98] overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linksaver focus-visible:ring-offset-2"
                        >
                          {/* Favicon */}
                          <div className="w-12 h-12 rounded-[0.9rem] bg-secondary flex items-center justify-center shrink-0 overflow-hidden border border-border shadow-sm">
                            {domain ? (
                              <img
                                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                                alt=""
                                className="w-7 h-7 object-contain"
                                loading="lazy"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <Link2
                                size={18}
                                strokeWidth={2}
                                className="text-muted-foreground/50"
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0 space-y-1.5">
                            <h3 className="font-bold text-sm text-foreground line-clamp-1 leading-snug">
                              {link.title}
                            </h3>
                            {domain && (
                              <span className="text-[11px] font-medium text-muted-foreground/70 truncate block">
                                {domain}
                              </span>
                            )}
                            {link.note && (
                              <span className="text-[10px] font-bold uppercase tracking-wider text-linksaver bg-linksaver/10 px-2 py-0.5 rounded-md border border-linksaver/20 inline-block leading-relaxed">
                                {link.note}
                              </span>
                            )}
                          </div>

                          {/* Copy button */}
                          <button
                            type="button"
                            aria-label={
                              copiedId === link.id
                                ? 'Tersalin'
                                : `Salin URL ${link.title}`
                            }
                            onClick={(e) =>
                              copyToClipboard(e, link.id, link.url)
                            }
                            className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-xl bg-secondary border border-border flex items-center justify-center hover:bg-linksaver/10 hover:text-linksaver hover:border-linksaver/30 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-linksaver focus-visible:ring-offset-2"
                          >
                            {copiedId === link.id ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{
                                  type: 'spring',
                                  stiffness: 500,
                                  damping: 18,
                                }}
                              >
                                <Check
                                  size={16}
                                  strokeWidth={3}
                                  className="text-linksaver"
                                />
                              </motion.div>
                            ) : (
                              <Copy
                                size={16}
                                strokeWidth={2.5}
                                className="text-muted-foreground/70"
                              />
                            )}
                          </button>

                          {/* External link indicator */}
                          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ExternalLink
                              size={12}
                              strokeWidth={2.5}
                              className="text-muted-foreground/30"
                            />
                          </div>
                        </div>
                      </SwipeableRow>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>

      {/* Form Sheet */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-sheet h-[90dvh] landscape:h-[75dvh] sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full z-50 outline-none border-t border-border/70 shadow-elevated">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-6 mt-4" />

            <form
              onSubmit={form.handleSubmit(onSubmitForm)}
              className="flex flex-col px-5 sm:px-6 pb-8 overflow-y-auto"
            >
              <h3 className="text-modal-title mb-6">Simpan Link Baru</h3>

              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-pill-label mb-2 block">Judul</label>
                  <input
                    {...form.register('title')}
                    placeholder="Contoh: Artikel React"
                    className="w-full bg-card border border-border rounded-xl py-3.5 px-4 outline-none focus:border-linksaver focus:ring-2 focus:ring-linksaver/20 text-sm font-bold text-foreground transition-all shadow-sm"
                    autoFocus
                  />
                  {form.formState.errors.title && (
                    <FormError className="mt-2 ml-1">
                      {form.formState.errors.title.message as string}
                    </FormError>
                  )}
                </div>

                <div>
                  <label className="text-pill-label mb-2 block">URL Link</label>
                  <div className="relative">
                    <ExternalLink
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none"
                      size={18}
                      strokeWidth={2.2}
                    />
                    <input
                      {...form.register('url')}
                      type="url"
                      placeholder="https://..."
                      className="w-full bg-card border border-border rounded-xl py-3.5 pl-11 pr-4 outline-none focus:border-linksaver focus:ring-2 focus:ring-linksaver/20 text-sm font-bold text-foreground transition-all shadow-sm"
                    />
                  </div>
                  {form.formState.errors.url && (
                    <FormError className="mt-2 ml-1">
                      {form.formState.errors.url.message as string}
                    </FormError>
                  )}
                </div>

                <div>
                  <label className="text-pill-label mb-2 block">
                    Catatan Tambahan
                  </label>
                  <textarea
                    {...form.register('note')}
                    placeholder="Kenapa link ini disimpan?"
                    aria-label="Catatan tambahan"
                    className="w-full h-24 resize-none bg-card border border-border rounded-xl py-3.5 px-4 outline-none focus:border-linksaver focus:ring-2 focus:ring-linksaver/20 text-sm font-medium text-foreground transition-all shadow-sm"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-linksaver text-white hover:bg-linksaver/90 text-base font-bold py-4 rounded-[1.25rem] mt-auto"
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
