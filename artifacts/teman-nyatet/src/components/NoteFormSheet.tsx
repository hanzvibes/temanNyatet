import { Drawer } from 'vaul';
import { Loader2 } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { FormError } from '@/components/PageStates';
import { NOTE_TAGS } from '@/lib/categoryIcons';
import type { NoteFormValues } from '@/lib/notes';
import NoteColorPicker from '@/components/NoteColorPicker';
import RichTextEditor from '@/components/RichTextEditor';

interface NoteFormSheetProps {
  open: boolean;
  selectedNoteTitle?: string | null;
  form: UseFormReturn<NoteFormValues>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NoteFormValues) => void | Promise<void>;
}

export default function NoteFormSheet({
  open,
  selectedNoteTitle,
  form,
  onOpenChange,
  onSubmit,
}: NoteFormSheetProps) {
  const formColor = form.watch('color');
  const currentTags = form.watch('tags');
  const content = form.watch('content');

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px]" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-50 flex max-h-sheet h-[90dvh] landscape:h-[75dvh] flex-col overflow-hidden rounded-t-[1.75rem] border-t border-border/60 shadow-elevation-3 outline-none sm:left-1/2 sm:right-auto sm:w-full sm:max-w-md sm:-translate-x-1/2"
          style={{
            backgroundColor: formColor || 'hsl(var(--card))',
            transition: 'background-color 0.2s ease',
          }}
        >
          <div className="mx-auto mb-1 mt-3.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />

          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-1 flex-col overflow-hidden px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-6"
          >
            <div className="mb-5 mt-3 flex shrink-0 items-center justify-between gap-3">
              <h3 className="min-w-0 flex-1 truncate text-section-title">
                {selectedNoteTitle ? 'Edit Catatan' : 'Catatan Baru'}
              </h3>
              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                aria-busy={form.formState.isSubmitting}
                className="flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-primary/12 px-5 py-2 text-sm font-bold text-primary transition-all hover:bg-primary/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {form.formState.isSubmitting && (
                  <Loader2 size={15} className="animate-spin" aria-hidden="true" />
                )}
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
              <RichTextEditor
                value={content}
                onChange={(html) =>
                  form.setValue('content', html, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                placeholder="Apa yang ingin kamu catat?"
                ariaLabel="Isi catatan"
                autoFocus
                className="min-h-48 text-lg text-foreground"
              />
              {form.formState.errors.content && (
                <FormError>{form.formState.errors.content.message}</FormError>
              )}

              <div>
                <label className="text-pill-label mb-3 block opacity-70">Tags</label>
                <div className="flex flex-wrap gap-2">
                  {NOTE_TAGS.map(({ name: tag, icon: Icon }) => {
                    const isSelected = currentTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          form.setValue(
                            'tags',
                            isSelected
                              ? currentTags.filter((currentTag) => currentTag !== tag)
                              : [...currentTags, tag],
                          )
                        }
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

              <NoteColorPicker
                value={formColor ?? ''}
                onChange={(color) => form.setValue('color', color)}
              />
            </div>
          </form>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}