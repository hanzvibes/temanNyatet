// Shared empty + loading state components for the four feature pages.
// Single source of truth so the visual treatment (icon, copy, accent color,
// height, padding) is identical across Catatan, Keuangan, Todo, Link Saver.
//
// Why this file exists:
//   - Each page used to roll its own `<Loader2 className=".. text-[#XXX]" />`
//     and its own ad-hoc empty div with a 48px lucide icon and a one-line
//     copy. Inconsistencies: Catatan used `h-[50vh]`, Keuangan used `h-40`,
//     plus three of the four pages used inline hex colors that already exist
//     as `--color-finance` / `--color-todo` / `--color-linksaver` in @theme.
//   - The empty-state copy also drifted: Keuangan said "Belum ada transaksi
//     bulan ini"; Catatan said "Belum ada catatan. Mulai catat sat-set!";
//     To-do said "Semua beres! Tambah to-do baru." Different vibes. Here we
//     standardize on title + hint, where the hint explains how to add the
//     first item (drawer pull or + button).
//
// Why `lucide-react` icon prop:
//   - Pages already import from lucide-react. Single dependency tree.

import React from 'react';
import { AlertCircle, Loader2, type LucideIcon } from 'lucide-react';

export type SectionAccent = 'catatan' | 'keuangan' | 'todo' | 'link';

// Per-section accent palettes. The empty-state icon container uses a soft
// tinted background + a darker accent for the icon itself so it stays visible
// against the cream app background without flashing bright color. Numbers
// chosen for WCAG AA against white/cream (~5.5:1 minimum).
const SECTION_THEME: Record<
  SectionAccent,
  { containerBg: string; containerBorder: string; iconText: string; spinnerText: string }
> = {
  catatan: {
    containerBg: 'bg-primary/10',
    containerBorder: 'border-primary/20',
    iconText: 'text-primary',
    spinnerText: 'text-primary',
  },
  keuangan: {
    containerBg: 'bg-[#F4C753]/15',
    containerBorder: 'border-[#F4C753]/35',
    iconText: 'text-[#8B6914]',
    spinnerText: 'text-[#8B6914]',
  },
  todo: {
    containerBg: 'bg-[#9CB4D4]/15',
    containerBorder: 'border-[#9CB4D4]/35',
    iconText: 'text-[#3D6B96]',
    spinnerText: 'text-[#3D6B96]',
  },
  link: {
    containerBg: 'bg-[#E09898]/15',
    containerBorder: 'border-[#E09898]/35',
    iconText: 'text-[#963D3D]',
    spinnerText: 'text-[#963D3D]',
  },
};

interface PageEmptyProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  accent?: SectionAccent;
  /** Optional CTA element placed below the description (e.g. a "+ Tambah" button). */
  cta?: React.ReactNode;
}

/**
 * Page-level empty state.
 *
 * Visual anatomy:
 *   - 80×80 rounded container at the section accent tint
 *   - 32×32 lucide icon, darker accent color
 *   - Two-line text block: bold title + quiet description hint explaining how to add content
 *   - Optional CTA below
 *
 * Height: at least `min-h-[40vh]` so it visually anchors the page even on
 * short viewports (e.g. iPhone SE portrait, ~44vh usable area minus sheet nav).
 */
export function PageEmpty({ icon: Icon, title, description, accent = 'catatan', cta }: PageEmptyProps) {
  const t = SECTION_THEME[accent];
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center text-center min-h-[42vh] px-6 py-6 gap-4"
    >
      <div
        className={`w-20 h-20 rounded-3xl ${t.containerBg} border ${t.containerBorder} flex items-center justify-center flex-shrink-0`}
      >
        <Icon size={34} strokeWidth={2} className={t.iconText} />
      </div>
      <div className="space-y-1.5 max-w-xs">
        <p className={`font-extrabold text-base ${t.iconText}`}>{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed font-medium">
            {description}
          </p>
        )}
      </div>
      {cta}
    </div>
  );
}

interface FormErrorProps {
  /** The error message text. */
  children: React.ReactNode;
  /** Extra spacing / positioning. Ask before you change position-class expectations. */
  className?: string;
  /** Text size — `xs` for inline form errors, `sm` for general alert paragraphs. */
  size?: 'sm' | 'xs';
}

/**
 * Inline form-error message with built-in icon.
 *
 * Why an icon at all:
 *   WCAG SC 1.4.1 (Use of Color) says color is not the only visual means of
 *   conveying information. The original forms used plain `text-destructive`
 *   red text alone; that hits ~4.6:1 contrast in light mode, fine for
 *   readability, but unreadable as an "error" to a red-green colorblind
 *   user if the message is short ("Required"). Adding the AlertCircle icon
 *   pairs the red color with a redundant non-color cue.
 *
 * Visual anatomy:
 *   - 12–14px AlertCircle icon (red) + message text in same red tone
 *   - flex layout prevents the icon from being squished on narrow viewports
 *   - role="alert" + aria-live="polite" so screen readers announce when
 *     the error appears (after the user submits an invalid form)
 */
export function FormError({ children, className = '', size = 'sm' }: FormErrorProps) {
  const sizeCls = size === 'xs' ? 'text-xs' : 'text-sm';
  const iconSize = size === 'xs' ? 12 : 14;
  return (
    <p
      role="alert"
      aria-live="polite"
      className={`flex items-center gap-1.5 ${sizeCls} font-medium text-destructive ${className}`}
    >
      <AlertCircle size={iconSize} strokeWidth={2.5} className="flex-shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

interface PageLoadingProps {
  accent?: SectionAccent;
  label?: string;
}

/**
 * Page-level loading state.
 *
 * Visual anatomy:
 *   - 28×28 spinner in the section accent color (darker variant for visibility)
 *   - Small uppercase label underneath so screen readers + sighted users
 *     both know data is being fetched
 *
 * Height: `min-h-[40vh]` to prevent layout shift when the data resolves and
 * the empty/grid state replaces it.
 */
export function PageLoading({ accent = 'catatan', label = 'Memuat…' }: PageLoadingProps) {
  const t = SECTION_THEME[accent];
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[40vh] gap-3"
    >
      <Loader2 className={`w-7 h-7 animate-spin ${t.spinnerText}`} aria-hidden="true" />
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}
