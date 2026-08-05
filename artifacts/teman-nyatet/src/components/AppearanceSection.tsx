import { Check } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  useAppearance,
  FONT_FAMILIES,
  PALETTE_OPTIONS,
  RADIUS_VALUES,
  type AppFont,
  type AppRadius,
} from '@/hooks/useAppearance';

/* ─── Font options ─────────────────────────────────────────────────────────── */
const FONT_OPTIONS: Array<{
  value: AppFont;
  label: string;
  description: string;
}> = [
  { value: 'inter',             label: 'Inter',            description: 'Bersih & netral' },
  { value: 'plus-jakarta-sans', label: 'Jakarta Sans',     description: 'Modern & tegas' },
  { value: 'dm-sans',           label: 'DM Sans',          description: 'Geometris & ramah' },
  { value: 'nunito',            label: 'Nunito',           description: 'Bulat & hangat' },
];

/* ─── Radius presets ───────────────────────────────────────────────────────── */
const RADIUS_OPTIONS: Array<{
  value: AppRadius;
  label: string;
  cssValue: string;
}> = [
  { value: 'compact', label: 'Persegi', cssValue: RADIUS_VALUES.compact },
  { value: 'default', label: 'Standar', cssValue: RADIUS_VALUES.default },
  { value: 'rounded', label: 'Rounded', cssValue: RADIUS_VALUES.rounded },
  { value: 'pill',    label: 'Bulat',   cssValue: RADIUS_VALUES.pill },
];

export default function AppearanceSection() {
  const { prefs, setPrefs } = useAppearance();

  return (
    <div className="space-y-6 pt-1 pb-2">

      {/* ── Tema ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-muted-foreground px-1">
          Tema
        </p>
        <ThemeToggle />
      </div>

      {/* ── Palet warna ───────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-muted-foreground px-1">
          Palet Warna
        </p>
        <div
          role="radiogroup"
          aria-label="Palet warna aplikasi"
          className="grid grid-cols-2 gap-2"
        >
          {PALETTE_OPTIONS.map(({ value, label, description, swatches }) => {
            const selected = prefs.palette === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${label}, ${description}`}
                onClick={() => setPrefs({ palette: value })}
                className={`relative flex min-h-[5.25rem] flex-col items-start justify-between overflow-hidden rounded-2xl border px-3.5 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  selected
                    ? 'border-primary/40 bg-primary/5 shadow-elevation-1'
                    : 'border-border bg-secondary/60 hover:bg-secondary active:bg-secondary/80'
                }`}
              >
                {selected && (
                  <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check size={10} strokeWidth={3.5} />
                  </span>
                )}
                <span className="flex h-7 w-full overflow-hidden rounded-lg border border-black/5 shadow-inner dark:border-white/10" aria-hidden="true">
                  {swatches.map((color) => (
                    <span key={color} className="h-full flex-1" style={{ backgroundColor: color }} />
                  ))}
                </span>
                <span className="mt-2 text-[0.8125rem] font-bold leading-none text-foreground">
                  {label}
                </span>
                <span className="text-[0.6875rem] leading-snug text-muted-foreground">
                  {description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Font ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-muted-foreground px-1">
          Font
        </p>
        <div className="grid grid-cols-2 gap-2">
          {FONT_OPTIONS.map(({ value, label, description }) => {
            const selected = prefs.font === value;
            const fontFamily = FONT_FAMILIES[value];
            return (
              <button
                key={value}
                type="button"
                onClick={() => setPrefs({ font: value })}
                className={`relative flex flex-col items-start gap-1.5 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  selected
                    ? 'border-primary/40 bg-primary/5 shadow-elevation-1'
                    : 'border-border bg-secondary/60 hover:bg-secondary active:bg-secondary/80'
                }`}
              >
                {selected && (
                  <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check size={10} strokeWidth={3.5} />
                  </span>
                )}
                {/* Large preview glyph in the target font */}
                <span
                  className="text-2xl font-semibold leading-none text-foreground"
                  style={{ fontFamily }}
                  aria-hidden="true"
                >
                  Aa
                </span>
                <span className="text-[0.8125rem] font-bold text-foreground leading-none">
                  {label}
                </span>
                <span className="text-[0.6875rem] text-muted-foreground leading-snug">
                  {description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sudut komponen ────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-muted-foreground px-1">
          Sudut Komponen
        </p>
        <div className="grid grid-cols-4 gap-2">
          {RADIUS_OPTIONS.map(({ value, label, cssValue }) => {
            const selected = prefs.radius === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setPrefs({ radius: value })}
                className={`flex flex-col items-center gap-2.5 rounded-2xl border px-2 py-3 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  selected
                    ? 'border-primary/40 bg-primary/5 shadow-elevation-1'
                    : 'border-border bg-secondary/60 hover:bg-secondary active:bg-secondary/80'
                }`}
              >
                {/* Visual swatch showing the corner radius */}
                <div
                  className={`h-8 w-8 border-2 ${
                    selected ? 'border-primary' : 'border-muted-foreground/35'
                  }`}
                  style={{ borderRadius: cssValue }}
                  aria-hidden="true"
                />
                <span
                  className={`text-[0.6875rem] font-semibold leading-none ${
                    selected ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
