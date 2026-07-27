import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { AnimatePresence } from 'framer-motion';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import SettingsSheet from '@/components/SettingsSheet';
import { useLinks } from '@/hooks/useLinks';
import { useCreate } from '@/contexts/CreateContext';
import { Loader2, Link2, Copy, ExternalLink, Compass, Hand, Plus } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
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

export default function LinkSaverPage() {
  const { user } = useAuthContext();
  const { links, loading, createLink, deleteLink } = useLinks(user?.id);
  const { pendingCreate, clearCreate } = useCreate();
  const [search, setSearch] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    return links.filter(l => 
      l.title.toLowerCase().includes(lower) || 
      l.url.toLowerCase().includes(lower)
    );
  }, [links, search]);

  const onSubmitForm = async (data: LinkFormValues) => {
    try {
      // Ensure URL has protocol
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
    } catch (e) {
      toast.error('Gagal menyimpan link. Coba lagi.');
    }
  };

  const copyToClipboard = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    toast.success('URL disalin!');
  };

  const openLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Long press handling: delete on long press without confirmation toast.
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const handlePressStart = (id: string) => {
    pressTimer.current = setTimeout(async () => {
      setDeletingId(id);
      try {
        await deleteLink(id);
      } finally {
        setDeletingId(null);
      }
    }, 800);
  };
  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div className="flex flex-col h-full bg-background min-h-dvh pb-32 lg:pb-16">
      {/* Header Area */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border/50">
        <div className="px-5 py-5 pb-4 space-y-4 sm:px-6 lg:px-10 lg:py-7 lg:pb-5 max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1 lg:hidden">TEMAN NYATET</div>
              <h1 className="text-page-title">Link Saver</h1>
            </div>
            <SettingsSheet avatarBg="bg-linksaver/15" avatarTextColor="text-linksaver-text" />
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Cari link..." />
        </div>
      </div>

      {/* Content */}
      <div className="px-5 sm:px-6 lg:px-10 mt-5 lg:mt-7 flex-1 max-w-screen-xl mx-auto w-full">
        {loading ? (
          <PageLoading accent="link" label="Memuat link…" />
        ) : filteredLinks.length === 0 ? (
          <PageEmpty
            accent="link"
            icon={Link2}
            title={search ? 'Tidak ada hasil pencarian' : 'Belum ada link tersimpan'}
            description={search ? 'Coba kata kunci lain atau hapus filter.' : 'Simpan link penting agar mudah ditemukan kapan saja.'}
            cta={!search ? (
              <Button
                onClick={() => { form.reset(); setIsFormOpen(true); }}
                className="bg-linksaver text-white hover:bg-linksaver/90 rounded-full px-6 py-3.5"
              >
                <Plus size={18} strokeWidth={2.5} />
                Simpan Link Pertama
              </Button>
            ) : undefined}
          />
        ) : (
          <div className="grid gap-4 pb-8 md:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence>
              {filteredLinks.map(link => {
                // Extract domain for favicon
                let domain = '';
                try { domain = new URL(link.url).hostname; } catch (e) {}

                return (
                  <AnimatedListItem
                    key={link.id}
                    onClick={() => openLink(link.url)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openLink(link.url);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-label={`Buka link: ${link.title}. Tahan 0,8 detik untuk hapus.`}
                    onMouseDown={() => handlePressStart(link.id)}
                    onMouseUp={handlePressEnd}
                    onMouseLeave={handlePressEnd}
                    onTouchStart={() => handlePressStart(link.id)}
                    onTouchEnd={handlePressEnd}
                    onTouchMove={handlePressEnd}
                     className="relative bg-card rounded-[1.25rem] p-4 shadow-elevation-1 border border-card-border flex items-center gap-4 cursor-pointer hover:border-linksaver/50 hover:bg-secondary/30 hover:shadow-elevation-2 transition-all active:scale-[0.98] overflow-hidden
                               focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2"
                  >
                    {deletingId === link.id && (
                      <div className="absolute inset-0 z-10 bg-card/90 backdrop-blur-[1px] flex items-center justify-center gap-2 text-destructive font-bold text-sm">
                        <Loader2 size={16} className="animate-spin" /> Menghapus...
                      </div>
                    )}
                     <div className="w-14 h-14 bg-secondary rounded-[1rem] flex items-center justify-center flex-shrink-0 overflow-hidden border border-border shadow-elevation-1">
                      {domain ? (
                        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" className="w-7 h-7 object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} />
                      ) : (
                        <Compass className="text-muted-foreground/50" size={24} strokeWidth={2.5} />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-foreground line-clamp-1 mb-1">{link.title}</h3>
                      <div className="flex items-center text-xs font-bold text-muted-foreground gap-1">
                        <span className="truncate">{link.url.replace(/^https?:\/\//, '')}</span>
                      </div>
                      {link.note && (
                        <p className="text-[11px] font-bold uppercase tracking-wider text-linksaver mt-2 line-clamp-1 bg-linksaver/10 px-2 py-1 rounded-md inline-block border border-linksaver/20">{link.note}</p>
                      )}
                      <p className="flex items-center gap-1 text-[10px] text-muted-foreground/45 mt-1.5 select-none" aria-hidden="true">
                        <Hand size={10} strokeWidth={2.5} />
                        Tahan untuk hapus
                      </p>
                    </div>

                    <button
                      type="button"
                      aria-label={`Salin URL ${link.title}`}
                      onClick={(e) => copyToClipboard(e, link.url)}
                       className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-secondary border border-border text-muted-foreground flex items-center justify-center hover:bg-linksaver/10 hover:text-linksaver hover:border-linksaver/30 transition-colors
                                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2"
                    >
                      <Copy size={16} strokeWidth={2.5} />
                    </button>
                  </AnimatedListItem>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Form Sheet */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-[90vh] sm:max-w-md sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-full z-50 outline-none border-t border-border/70 shadow-elevated">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-6 mt-4" />

            <form onSubmit={form.handleSubmit(onSubmitForm)} className="flex flex-col px-5 sm:px-6 pb-8 overflow-y-auto">
              <h3 className="text-modal-title mb-6">Simpan Link Baru</h3>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Judul</label>
                  <input
                    {...form.register('title')}
                    placeholder="Contoh: Artikel React"
                     className="w-full bg-card border border-border rounded-xl py-3 px-4 outline-none focus:border-linksaver focus:ring-2 focus:ring-linksaver/20 text-base font-bold text-foreground transition-all shadow-elevation-1"
                    autoFocus
                  />
                  {form.formState.errors.title && (
                    <FormError className="mt-2 ml-1">{form.formState.errors.title.message as string}</FormError>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">URL Link</label>
                  <div className="relative">
                    <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/50" size={20} strokeWidth={2.5} />
                    <input
                      {...form.register('url')}
                      type="url"
                      placeholder="https://..."
                       className="w-full bg-card border border-border rounded-xl py-3 pl-12 pr-4 outline-none focus:border-linksaver focus:ring-2 focus:ring-linksaver/20 text-base font-bold text-foreground transition-all shadow-elevation-1"
                    />
                  </div>
                  {form.formState.errors.url && (
                    <FormError className="mt-2 ml-1">{form.formState.errors.url.message as string}</FormError>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Catatan Tambahan</label>
                  <textarea
                    {...form.register('note')}
                    placeholder="Kenapa link ini disimpan?"
                     aria-label="Catatan tambahan"
                     className="w-full h-24 resize-none bg-card border border-border rounded-xl py-3 px-4 outline-none focus:border-linksaver focus:ring-2 focus:ring-linksaver/20 text-sm font-medium text-foreground transition-all shadow-elevation-1"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-linksaver text-white hover:bg-linksaver/90 text-lg py-4 rounded-[1.25rem] mt-auto"
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
