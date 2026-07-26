# UI_UX_GUIDELINES.md — TemanNyatet

> Coding conventions and design decisions for the frontend. Read alongside [`AI_CONTEXT.md`](./AI_CONTEXT.md).

## Related documentation

| Document | Path |
|---|---|
| README — project overview & docs map | [`README.md`](../README.md) |
| AI_CONTEXT — frontend conventions & stack | [`AI_CONTEXT.md`](./AI_CONTEXT.md) |
| PRD — product requirements that drive UX | [`PRD.md`](./PRD.md) |
| TESTING — manual UI checklist | [`TESTING.md`](./TESTING.md) |

---

## Design philosophy

**"Sat-set"** — Indonesian slang for no-frills, gets-it-done. The UI is mobile-first, direct, and fast. Animations exist to signal state transitions, not to entertain. Every interaction should feel instant.

---

## Color system

Colors are defined as CSS custom properties in `artifacts/teman-nyatet/src/index.css` using Tailwind CSS 4's `@theme` block.

### Section accent colors

Each of the four modules has a distinct accent used in icons, buttons, empty states, and focus rings:

| Section | Light mode | Dark mode | Tailwind token |
|---|---|---|---|
| Catatan (Notes) | `--primary` (green) | `--primary` | `text-primary`, `bg-primary` |
| Keuangan (Finance) | `#F4C753` (yellow) | `#F4C753` | `text-finance`, `bg-[#F4C753]` |
| Todo | `#9CB4D4` (blue) | `#9CB4D4` | `text-todo`, `bg-todo` |
| Link Saver | `#E09898` (rose) | `#E09898` | `text-linksaver`, `bg-linksaver` |

> Keuangan, Todo, and Link Saver use inline hex for some uses because Tailwind 4 arbitrary-value utilities do not reliably apply opacity modifiers (`/15`, `/20`) to CSS variable tokens. Where opacity is needed, use the hex directly.

### Note card colors

Four sticky-note tints, defined as CSS tokens and referenced via `var()` in JS:

| Token | Light | Dark |
|---|---|---|
| `--note-card-1` | `#FFF8D6` (cream yellow) | `#1F2D1A` |
| `--note-card-2` | `#E8F2DF` (pale green) | `#2D381F` |
| `--note-card-3` | `#FFE4E1` (blush pink) | `#38201E` |
| `--note-card-4` | `#E1F0FF` (sky blue) | `#1A2638` |

Never use hardcoded hex for note card backgrounds — always use `var(--note-card-N)`.

### Semantic tokens

- `bg-background` — page background (cream in light, dark slate in dark)
- `bg-card` — card / drawer / modal surface
- `text-foreground` — primary text
- `text-muted-foreground` — secondary text, labels, hints
- `border-border` — default border color
- `bg-secondary` — subtle chip/badge backgrounds

---

## Typography

Custom utility classes defined in `index.css`:

| Class | Usage |
|---|---|
| `text-page-title` | Page H1 (e.g., "Catatan", "Keuangan") |
| `text-section-title` | Section headers within a page |
| `text-modal-title` | Drawer / modal heading |
| `text-pill-label` | Small uppercase labels above inputs |
| `text-pill-tag` | Tag chip text |

Never use ad-hoc `text-2xl font-bold` for headings — use the semantic classes. This ensures all pages are visually consistent.

---

## Component conventions

### Empty states — `PageEmpty`

Always use `PageEmpty` from `src/components/PageStates.tsx` for module-level empty states.

```tsx
<PageEmpty
  accent="catatan"           // 'catatan' | 'keuangan' | 'todo' | 'link'
  icon={BookOpen}            // LucideIcon
  title="Belum ada catatan"
  description="Short encouraging text."
  cta={!search ? (           // Only show CTA when not in search mode
    <button onClick={handleOpenForm} className="...">
      <Plus size={18} /> Tambah Catatan Pertama
    </button>
  ) : undefined}
/>
```

- Search empty states (`search` truthy) should NOT show a CTA button
- Description should explain WHY the section is useful, not just instruct to use the handle
- CTA button should be thumb-reachable: at least `py-3.5` (≥44px height)

### Loading states — `PageLoading`

```tsx
<PageLoading accent="catatan" label="Memuat catatan…" />
```

Always provide a human-readable Indonesian label.

### Form errors — `FormError`

```tsx
<FormError>{form.formState.errors.content.message}</FormError>
<FormError size="xs">Short inline error</FormError>
```

Never use plain red text for form errors — `FormError` adds the `AlertCircle` icon required for WCAG 1.4.1 (color not the only visual cue).

### Drawers (vaul)

All create/edit forms use `<Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>` from vaul. Standard structure:

```tsx
<Drawer.Root open={isFormOpen} onOpenChange={setIsFormOpen}>
  <Drawer.Portal>
    <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
    <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-[90vh] z-50 outline-none">
      <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mb-4 mt-4" />
      {/* form content */}
    </Drawer.Content>
  </Drawer.Portal>
</Drawer.Root>
```

The drag handle (rounded pill) must always be the first element inside `Drawer.Content`.

### Modals (detail / edit overlays)

Full-screen backdrop + centered card pattern using `framer-motion`:

```tsx
<AnimatePresence>
  {isOpen && (
    <>
      <motion.div
        className="fixed inset-0 z-50 bg-black/25 backdrop-blur-[3px]"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => setIsOpen(false)}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center px-5 pointer-events-none">
        <motion.div
          className="w-full max-w-sm pointer-events-auto"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* card content */}
          {/* close button below card */}
        </motion.div>
      </div>
    </>
  )}
</AnimatePresence>
```

Always include a "Tutup" (Close) button below the card — don't rely on backdrop click only.

### Buttons

Use standard Tailwind utility classes consistent with existing patterns. For primary actions in forms:

```tsx
// Standard form submit button pattern
<button type="submit" className="w-full bg-primary text-primary-foreground font-bold text-lg py-4 rounded-[1.25rem] shadow-sm hover:bg-primary/90 transition-colors">
  Simpan
</button>
```

For section-specific buttons, use the section accent color:
- Keuangan: `bg-[#F4C753] text-[#4A3D18] hover:bg-[#E0B442]`
- Todo: `bg-todo text-white hover:bg-[#8AA8CF]`
- Link Saver: `bg-linksaver text-white hover:bg-[#D48888]`

Minimum tap target: `py-3.5` (≈44–48px height). Add `active:scale-95` for tactile feedback on touch.

---

## Accessibility

| Requirement | Implementation |
|---|---|
| Focus rings | Use `focus-visible:` (not `focus:`) — paints on keyboard, not mouse click |
| Touch targets | Min 44×44 px for interactive elements (`w-9 h-9` minimum for icon buttons) |
| Color + icon | Error states use `FormError` with `AlertCircle` icon (not color alone) |
| Screen reader labels | `aria-label` on icon-only buttons, `role` + `aria-label` on list items with complex interactions |
| Keyboard navigation | Tab to interactive elements; `Enter`/`Space` for activation |
| Long-press actions | Currently missing keyboard alternative — see `TASKS.md` TASK-008 |

---

## Layout patterns

### Mobile content area

Pages use `pb-32 lg:pb-16` to clear the bottom sheet nav height. The nav uses `--bottom-nav-collapsed-h: 96px` CSS token.

### Sticky headers

```tsx
<div className="sticky top-0 z-10 bg-background/90 backdrop-blur-md">
  <div className="px-6 py-6 pb-4 space-y-5 lg:px-10 max-w-screen-xl mx-auto">
    {/* title + search */}
  </div>
</div>
```

Content area:
```tsx
<div className="px-6 lg:px-10 flex-1 pt-2 max-w-screen-xl mx-auto w-full">
```

Always use `max-w-screen-xl mx-auto` for content to constrain width on large screens.

### Desktop two-column layout (Keuangan)

Balance card on the left (sticky), transaction list on the right:

```tsx
<div className="lg:grid lg:grid-cols-[360px_1fr] lg:gap-10 lg:items-start">
```

Todo desktop uses a two-column grid for pending/completed items:
```tsx
<div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
```

---

## Animations

Use framer-motion for:
- Modal entrance/exit (`opacity` + `scale` spring)
- List item add/remove (`AnimatedListItem` component — handles `AnimatePresence` exit)
- Bottom sheet snap (`DraggableSheet` — spring physics, snap to 'collapsed'/'half'/'expanded')

Do NOT use CSS transitions for structural layout changes (use framer-motion). Use CSS `transition-colors` and `transition-all` for hover/focus color changes only.

---

## Dark mode

- Toggle stored in `localStorage` as `'dark'` or `'light'`
- Applied synchronously in `main.tsx` before first paint to prevent flash
- Use Tailwind's `dark:` variant for all dark overrides
- For section-specific dark colors that can't use opacity modifiers, provide explicit `dark:` hex values

---

## Navigation — overlay bus

When adding a new drawer or modal:

```tsx
useEffect(() => {
  const event = new CustomEvent('teman-nyatet:any-overlay', { detail: { open: isOpen } });
  window.dispatchEvent(event);
}, [isOpen]);
```

This hides the PWA install prompt while any overlay is open.

---

## Indonesian copy guidelines

- Use "Tap" not "Klik" for touch interactions
- "Simpan" for save/submit
- "Batal" for cancel
- "Tutup" for close (modals)
- "Hapus" for delete
- "Belum ada [noun]" for empty state titles (not "Tidak ada")
- "Tidak ada hasil pencarian" for search empty states
- Descriptions should explain the value of the section, not just repeat "pull to add"
