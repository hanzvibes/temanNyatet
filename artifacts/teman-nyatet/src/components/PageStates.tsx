// Shared empty + loading state components for the four feature pages.
// Single source of truth so the visual treatment (icon, copy, accent color,
// height, padding) is identical across Catatan, Keuangan, Todo, Link Saver.

import React from 'react';
import { AlertCircle, Loader2, type LucideIcon } from 'lucide-react';

function SkeletonShimmer({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-xl bg-muted/60 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-muted-foreground/10 to-transparent" />
    </div>
  );
}

export type SectionAccent = 'catatan' | 'keuangan' | 'todo' | 'link';

// Per-section accent palettes using theme tokens. In light mode the icon
// container uses a soft tint of the section color; in dark mode it uses the
// same section color at a low opacity so it stays muted against the slate
// canvas. Text colors are drawn from the dedicated `*-text` tokens which are
// dark in light mode and light in dark mode, ensuring WCAG contrast.
const SECTION_THEME: Record<
  SectionAccent,
  { containerBg: string; containerBorder: string; iconText: string; spinnerText: string }
> = {
  catatan: {
    containerBg: 'bg-primary/10 dark:bg-primary/15',
    containerBorder: 'border-primary/20 dark:border-primary/25',
    iconText: 'text-primary dark:text-primary',
    spinnerText: 'text-primary dark:text-primary',
  },
  keuangan: {
    containerBg: 'bg-finance/15 dark:bg-finance/15',
    containerBorder: 'border-finance/30 dark:border-finance/25',
    iconText: 'text-finance-text',
    spinnerText: 'text-finance-text',
  },
  todo: {
    containerBg: 'bg-todo/15 dark:bg-todo/15',
    containerBorder: 'border-todo/30 dark:border-todo/25',
    iconText: 'text-todo-text',
    spinnerText: 'text-todo-text',
  },
  link: {
    containerBg: 'bg-linksaver/15 dark:bg-linksaver/15',
    containerBorder: 'border-linksaver/30 dark:border-linksaver/25',
    iconText: 'text-linksaver-text',
    spinnerText: 'text-linksaver-text',
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
 *   - 64×64 rounded container at the section accent tint (smaller than the
 *     previous 80×80 so it doesn't dominate the page on small phones).
 *   - 28×28 lucide icon in the section text color.
 *   - Two-line text block: semibold title + quiet description hint.
 *   - Optional CTA below.
 */
export function PageEmpty({ icon: Icon, title, description, accent = 'catatan', cta }: PageEmptyProps) {
  const t = SECTION_THEME[accent];
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center text-center min-h-[42vh] px-6 py-10 gap-4"
    >
      <div
        className={`w-[4.25rem] h-[4.25rem] rounded-[1.25rem] ${t.containerBg} border ${t.containerBorder} flex items-center justify-center flex-shrink-0 shadow-elevation-1 animate-in fade-in duration-200`}
      >
        <Icon size={28} strokeWidth={2} className={t.iconText} />
      </div>
      <div className="space-y-1 max-w-xs">
        <p className={`font-semibold text-base leading-snug ${t.iconText}`}>{title}</p>
        {description && (
          <p className="text-sm text-muted-foreground leading-[1.65] font-medium">
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
  /** Extra spacing / positioning. */
  className?: string;
  /** Text size — `xs` for inline form errors, `sm` for general alert paragraphs. */
  size?: 'sm' | 'xs';
}

/**
 * Inline form-error message with built-in icon.
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
 *   - 28×28 spinner in the section accent color.
 *   - Small label underneath using normal letter spacing so it remains readable.
 */
export function PageLoading({ accent = 'catatan', label = 'Memuat…' }: PageLoadingProps) {
  const t = SECTION_THEME[accent];
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center justify-center min-h-[40vh] gap-3 px-6"
    >
      <div className="relative">
        <SkeletonShimmer className="absolute inset-0 -m-5 w-[calc(100%+2.5rem)] h-[calc(100%+2.5rem)] rounded-3xl opacity-35" />
        <Loader2 className={`relative w-6 h-6 animate-spin ${t.spinnerText}`} aria-hidden="true" />
      </div>
      <p className="text-xs font-semibold text-muted-foreground tracking-wide">
        {label}
      </p>
    </div>
  );
}

interface SkeletonPageProps {
  accent?: SectionAccent;
}

/**
 * Native-style skeleton page with section-tinted shimmer blocks.
 * Use while the first page payload is still loading.
 */
export function SkeletonPage({ accent = 'catatan' }: SkeletonPageProps) {
  const t = SECTION_THEME[accent];
  const tint = t.spinnerText.replace('text-', 'bg-');
  return (
    <div className="flex flex-col gap-4 px-5 sm:px-6 lg:px-10 pt-5 lg:pt-7 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <SkeletonShimmer className="h-8 w-36 rounded-lg" />
        <SkeletonShimmer className="h-10 w-10 rounded-full" />
      </div>
      <SkeletonShimmer className="h-11 w-full rounded-2xl" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={`h-40 rounded-[1.5rem] ${tint}/15 animate-pulse`} />
        ))}
      </div>
    </div>
  );
}
