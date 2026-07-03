import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { useLinks } from '@/hooks/useLinks';
import { useCreate } from '@/contexts/CreateContext';
import { Loader2, Link2, Copy, ExternalLink, Compass } from 'lucide-react';
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

  // Long press handling
  const pressTimer = useRef<NodeJS.Timeout | null>(null);
  const handlePressStart = (id: string) => {
    pressTimer.current = setTimeout(() => {
      if (confirm('Hapus link ini?')) {
        deleteLink(id);
      }
    }, 800);
  };
  const handlePressEnd = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || 'TN';

  return (
    <div className="flex flex-col h-full bg-background min-h-dvh pb-32">
      {/* Header Area */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md px-6 py-6 pb-4 border-b-0 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">TEMAN NYATET</div>
            <h1 className="text-2xl font-extrabold text-foreground">Link Saver</h1>
          </div>
          <div className="w-12 h-12 rounded-full bg-[#FFE4E1] border-2 border-white flex items-center justify-center text-[#E09898] font-bold shadow-sm">
            {userInitials}
          </div>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Cari link..." />
      </div>

      {/* Content */}
      <div className="px-6 mt-2 flex-1 space-y-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-[#E09898]" />
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center h-[50vh] text-muted-foreground">
            <Link2 size={48} className="mb-4 text-muted-foreground/30" />
            <p className="font-medium">{search ? 'Tidak ada hasil pencarian.' : 'Belum ada link tersimpan.'}</p>
          </div>
        ) : (
          <div className="space-y-4 pb-8">
            {filteredLinks.map(link => {
              // Extract domain for favicon
              let domain = '';
              try { domain = new URL(link.url).hostname; } catch (e) {}

              return (
                <div 
                  key={link.id}
                  onClick={() => openLink(link.url)}
                  onMouseDown={() => handlePressStart(link.id)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={() => handlePressStart(link.id)}
                  onTouchEnd={handlePressEnd}
                  onTouchMove={handlePressEnd}
                  className="bg-white rounded-[1.25rem] p-4 shadow-sm border border-border/50 flex items-center gap-4 cursor-pointer hover:border-[#E09898]/50 hover:bg-secondary/30 transition-all active:scale-[0.98]"
                >
                  <div className="w-14 h-14 bg-secondary rounded-[1rem] flex items-center justify-center flex-shrink-0 overflow-hidden border border-border">
                    {domain ? (
                      <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" className="w-7 h-7 object-contain" onError={(e) => { e.currentTarget.style.display='none'; }} />
                    ) : (
                      <Compass className="text-muted-foreground/50" size={24} strokeWidth={2.5} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-extrabold text-base text-foreground line-clamp-1 mb-1">{link.title}</h3>
                    <div className="flex items-center text-xs font-bold text-muted-foreground gap-1">
                      <span className="truncate">{link.url.replace(/^https?:\/\//, '')}</span>
                    </div>
                    {link.note && (
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#E09898] mt-2 line-clamp-1 bg-[#E09898]/10 px-2 py-1 rounded-md inline-block border border-[#E09898]/20">{link.note}</p>
                    )}
                  </div>

                  <button 
                    onClick={(e) => copyToClipboard(e, link.url)}
                    className="w-10 h-10 rounded-full bg-secondary border border-border text-muted-foreground flex items-center justify-center hover:bg-[#E09898]/10 hover:text-[#E09898] hover:border-[#E09898]/30 transition-colors"
                  >
                    <Copy size={16} strokeWidth={2.5} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>


      {/* Form Sheet */}
      <Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-[90vh] z-50 outline-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-6 mt-4" />
            
            <form onSubmit={form.handleSubmit(onSubmitForm)} className="flex flex-col px-6 pb-8 overflow-y-auto">
              <h3 className="font-extrabold text-2xl mb-6 text-foreground">Simpan Link Baru</h3>
              
              <div className="space-y-6 mb-8">
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Judul</label>
                  <input
                    {...form.register('title')}
                    placeholder="Contoh: Artikel React"
                    className="w-full bg-white border border-border rounded-xl py-3 px-4 outline-none focus:border-[#E09898] focus:ring-2 focus:ring-[#E09898]/20 text-base font-bold text-foreground transition-all"
                    autoFocus
                  />
                  {form.formState.errors.title && (
                    <p className="text-destructive font-medium text-sm mt-2 ml-1">{form.formState.errors.title.message as string}</p>
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
                      className="w-full bg-white border border-border rounded-xl py-3 pl-12 pr-4 outline-none focus:border-[#E09898] focus:ring-2 focus:ring-[#E09898]/20 text-base font-bold text-foreground transition-all"
                    />
                  </div>
                  {form.formState.errors.url && (
                    <p className="text-destructive font-medium text-sm mt-2 ml-1">{form.formState.errors.url.message as string}</p>
                  )}
                </div>
                
                <div>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Catatan Tambahan</label>
                  <textarea
                    {...form.register('note')}
                    placeholder="Kenapa link ini disimpan?"
                    className="w-full h-24 resize-none bg-white border border-border rounded-xl py-3 px-4 outline-none focus:border-[#E09898] focus:ring-2 focus:ring-[#E09898]/20 text-sm font-medium text-foreground transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#E09898] text-white font-bold text-lg py-4 rounded-[1.25rem] shadow-sm hover:bg-[#D48888] transition-colors mt-auto"
              >
                Simpan Link
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
