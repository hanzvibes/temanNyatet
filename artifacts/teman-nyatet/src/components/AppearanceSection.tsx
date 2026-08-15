import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  RotateCcw,
  Rows2,
  Rows3,
  Rows4,
  Zap,
  Wind,
  CircleOff,
  Ban,
  Waves,
  Droplets,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import {
  useAppearance,
  FONT_FAMILIES,
  PALETTE_OPTIONS,
  RADIUS_VALUES,
  TEXT_SCALE_VALUES,
  type AppFont,
  type AppRadius,
} from '@/hooks/useAppearance';
import { resolveTheme, useTheme, type ThemeMode } from '@/hooks/useTheme';
import AppearancePreview from '@/components/AppearancePreview';

/* ─── Shared pieces ───────────────────────────────────────────────────────── */

function Label({ children }: { children: ReactNode }) {
  return (
    <p className="px-1 text-[0.6875rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </p>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

/** Segmented control with the app's gliding selection pill (framer layoutId). */
function Segmented<T extends string>({
  value,
  onChange,
  options,
  layoutId,
}: {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  layoutId: string;
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div role="radiogroup" className="flex gap-1 rounded-2xl bg-muted/55 p-1">
      {options.map(({ value: optionValue, label, icon: Icon }) => {
        const selected = value === optionValue;
        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(optionValue)}
            className={`relative flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
              selected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/80'
            }`}
          >
            {selected && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-xl bg-card shadow-sm"
                transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
              />
            )}
            {Icon && <Icon size={15} strokeWidth={2.4} className="relative z-10" />}
            <span className="relative z-10">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Theme mode previews ─────────────────────────────────────────────────── */

const THEME_LIGHT = { bg: '#faf7f1', card: '#ffffff', text: '#1c2e28', accent: '#18a07a', border: 'rgba(28,46,40,0.14)' };
const THEME_DARK = { bg: '#0a120f', card: '#101b17', text: '#eef4f1', accent: '#3dbfa0', border: 'rgba(238,244,241,0.14)' };

interface ThemeColors {
  bg: string;
  card: string;
  text: string;
  accent: string;
  border: string;
}

function ThemeMiniMock({ colors }: { colors: ThemeColors }) {
  return (
    <div className="flex h-full w-full flex-col p-1.5" style={{ backgroundColor: colors.bg }}>
      <div className="flex items-center justify-between">
        <div className="h-1 w-7 rounded-full" style={{ backgroundColor: colors.text, opacity: 0.5 }} />
        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.accent }} />
      </div>
      <div
        className="mt-1.5 rounded-[5px] p-1.5"
        style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}` }}
      >
        <div className="h-1 w-2/3 rounded-full" style={{ backgroundColor: colors.text, opacity: 0.85 }} />
        <div className="mt-1 h-0.5 w-full rounded-full" style={{ backgroundColor: colors.text, opacity: 0.22 }} />
        <div className="mt-0.5 h-0.5 w-4/5 rounded-full" style={{ backgroundColor: colors.text, opacity: 0.22 }} />
      </div>
      <div className="mt-auto flex items-center gap-1">
        <div className="h-1.5 w-9 rounded-full" style={{ backgroundColor: colors.accent }} />
        <div className="h-1.5 flex-1 rounded-full" style={{ backgroundColor: colors.text, opacity: 0.12 }} />
        <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: colors.text, opacity: 0.25 }} />
      </div>
    </div>
  );
}

function SystemMock() {
  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 w-1/2">
        <ThemeMiniMock colors={THEME_LIGHT} />
      </div>
      <div className="absolute inset-y-0 left-1/2 w-1/2">
        <ThemeMiniMock colors={THEME_DARK} />
      </div>
      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
    </div>
  );
}

const THEME_OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string; colors?: ThemeColors; system?: boolean }> = [
  { value: 'light', label: 'Terang', colors: THEME_LIGHT },
  { value: 'dark', label: 'Gelap', colors: THEME_DARK },
  { value: 'system', label: 'Sistem', system: true },
];

/* ─── Font options ────────────────────────────────────────────────────────── */

const FONT_OPTIONS: Array<{ value: AppFont; label: string; description: string }> = [
  { value: 'inter', label: 'Inter', description: 'Bersih & netral' },
  { value: 'plus-jakarta-sans', label: 'Jakarta Sans', description: 'Modern & tegas' },
  { value: 'dm-sans', label: 'DM Sans', description: 'Geometris & ramah' },
  { value: 'nunito', label: 'Nunito', description: 'Bulat & hangat' },
];

const RADIUS_OPTIONS: Array<{ value: AppRadius; label: string; cssValue: string }> = [
  { value: 'compact', label: 'Persegi', cssValue: RADIUS_VALUES.compact },
  { value: 'default', label: 'Standar', cssValue: RADIUS_VALUES.default },
  { value: 'rounded', label: 'Rounded', cssValue: RADIUS_VALUES.rounded },
  { value: 'pill', label: 'Bulat', cssValue: RADIUS_VALUES.pill },
];

/* ─── Section ─────────────────────────────────────────────────────────────── */

export default function AppearanceSection() {
  const { prefs, setPrefs, resetPrefs } = useAppearance();
  const { mode, setMode } = useTheme();
  const effectiveTheme = resolveTheme(mode);

  const handleReset = () => {
    resetPrefs();
    setMode('light');
    toast.success('Tampilan dikembalikan ke default');
  };

  return (
    <div className="space-y-6 pt-1 pb-2">

      {/* ── Live preview ─────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Tampilan langsung</Label>
        <AppearancePreview />
      </div>

      {/* ── Tema ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Tema</Label>
        <div role="radiogroup" aria-label="Tema aplikasi" className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map(({ value, label, colors, system }) => {
            const selected = mode === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`Tema ${label}`}
                onClick={() => setMode(value)}
                className={`relative flex flex-col gap-1.5 rounded-2xl border p-1.5 text-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                  selected
                    ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/25 shadow-elevation-1'
                    : 'border-border bg-secondary/50 hover:bg-secondary active:bg-secondary/80'
                }`}
              >
                <span className="h-20 w-full overflow-hidden rounded-xl border border-border/50">
                  {system ? <SystemMock /> : colors ? <ThemeMiniMock colors={colors} /> : null}
                </span>
                <span className={`pb-0.5 text-xs font-bold ${selected ? 'text-primary' : 'text-foreground'}`}>
                  {label}
                </span>
                {selected && (
                  <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Check size={10} strokeWidth={3.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-center text-[0.6875rem] font-medium text-muted-foreground">
          {mode === 'system'
            ? `Mengikuti sistem — saat ini ${effectiveTheme === 'dark' ? 'gelap' : 'terang'}`
            : `Mode ${mode === 'dark' ? 'gelap' : 'terang'} aktif`}
        </p>
      </div>

      {/* ── Warna aksen ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Warna Aksen</Label>
        <div role="radiogroup" aria-label="Warna aksen aplikasi" className="grid grid-cols-2 gap-2">
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
                <span
                  className="flex h-7 w-full overflow-hidden rounded-lg border border-black/5 shadow-inner dark:border-white/10"
                  style={{ background: `linear-gradient(90deg, ${swatches.join(', ')})` }}
                  aria-hidden="true"
                />
                <span className="mt-2 text-[0.8125rem] font-bold leading-none text-foreground">{label}</span>
                <span className="text-[0.6875rem] leading-snug text-muted-foreground">{description}</span>
              </button>
            );
          })}
        </div>

        {/* Custom accent — native color input nested in the swatch */}
        <button
          type="button"
          role="radio"
          aria-checked={prefs.palette === 'custom'}
          aria-label="Warna aksen custom"
          onClick={() => setPrefs({ palette: 'custom' })}
          className={`relative flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
            prefs.palette === 'custom'
              ? 'border-primary/40 bg-primary/5 shadow-elevation-1'
              : 'border-border bg-secondary/60 hover:bg-secondary active:bg-secondary/80'
          }`}
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary">
            <span
              className="h-6 w-6 rounded-full"
              style={{ backgroundColor: prefs.customAccent }}
              aria-hidden="true"
            />
            <input
              type="color"
              value={prefs.customAccent}
              onChange={(event) => setPrefs({ palette: 'custom', customAccent: event.target.value })}
              aria-label="Pilih warna aksen custom"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[0.8125rem] font-bold leading-none text-foreground">Custom</span>
            <span className="mt-1 block text-[0.6875rem] leading-snug text-muted-foreground">
              Pilih warna aksen sendiri
            </span>
          </span>
          <span className="rounded-lg bg-card px-2 py-1 font-mono text-[10px] font-bold tabular-nums text-muted-foreground shadow-sm">
            {prefs.customAccent.toUpperCase()}
          </span>
          {prefs.palette === 'custom' && (
            <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Check size={10} strokeWidth={3.5} />
            </span>
          )}
        </button>
        <p className="px-1 text-[0.6875rem] font-medium leading-snug text-muted-foreground">
          Warna aksen menyentuh tombol, ikon, state aktif, switch, focus, dan progress di seluruh aplikasi.
        </p>
      </div>

      {/* ── Ukuran teks ──────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Ukuran Teks</Label>
        <Segmented
          value={prefs.textScale}
          onChange={(textScale) => setPrefs({ textScale })}
          layoutId="appearance-text-scale"
          options={[
            { value: 'small', label: 'Kecil' },
            { value: 'default', label: 'Default' },
            { value: 'large', label: 'Besar' },
            { value: 'xl', label: 'XL' },
          ]}
        />
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card px-3.5 py-3">
          <span
            className="font-bold leading-none text-primary"
            style={{ fontSize: `calc(1.25rem * ${TEXT_SCALE_VALUES[prefs.textScale]})` }}
            aria-hidden="true"
          >
            Aa
          </span>
          <div className="min-w-0">
            <p
              className="truncate font-bold text-foreground"
              style={{ fontSize: `calc(0.8125rem * ${TEXT_SCALE_VALUES[prefs.textScale]})` }}
            >
              Ukuran teks aktif
            </p>
            <p
              className="truncate text-muted-foreground"
              style={{ fontSize: `calc(0.6875rem * ${TEXT_SCALE_VALUES[prefs.textScale]})` }}
            >
              Berlaku untuk judul dan teks di seluruh aplikasi
            </p>
          </div>
        </div>
      </div>

      {/* ── Kerapatan ────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Kerapatan Tampilan</Label>
        <Segmented
          value={prefs.density}
          onChange={(density) => setPrefs({ density })}
          layoutId="appearance-density"
          options={[
            { value: 'compact', label: 'Ringkas', icon: Rows4 },
            { value: 'comfortable', label: 'Nyaman', icon: Rows3 },
            { value: 'spacious', label: 'Lega', icon: Rows2 },
          ]}
        />
        <p className="px-1 text-[0.6875rem] font-medium leading-snug text-muted-foreground">
          Menyesuaikan jarak antar kartu, baris, dan kontrol di semua halaman.
        </p>
      </div>

      {/* ── Animasi ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Animasi &amp; Gerakan</Label>
        <Segmented
          value={prefs.motion}
          onChange={(motionPref) => setPrefs({ motion: motionPref })}
          layoutId="appearance-motion"
          options={[
            { value: 'full', label: 'Penuh', icon: Zap },
            { value: 'reduced', label: 'Ringan', icon: Wind },
            { value: 'off', label: 'Mati', icon: CircleOff },
          ]}
        />
        <p className="px-1 text-[0.6875rem] font-medium leading-snug text-muted-foreground">
          {prefs.motion === 'full'
            ? 'Semua animasi dan transisi berjalan normal.'
            : prefs.motion === 'reduced'
              ? 'Animasi pergerakan diminimalkan, fade tetap halus.'
              : 'Semua animasi dan transisi dimatikan.'}
        </p>
      </div>

      {/* ── Transparansi & blur ──────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Transparansi &amp; Blur</Label>
        <Segmented
          value={prefs.glass}
          onChange={(glass) => setPrefs({ glass })}
          layoutId="appearance-glass"
          options={[
            { value: 'none', label: 'Mati', icon: Ban },
            { value: 'minimal', label: 'Minimal', icon: Waves },
            { value: 'default', label: 'Standar', icon: Droplets },
            { value: 'heavy', label: 'Pekat', icon: Sparkles },
          ]}
        />
        <p className="px-1 text-[0.6875rem] font-medium leading-snug text-muted-foreground">
          Mengontrol efek kaca pada header, sidebar, dan navigasi bawah.
        </p>
      </div>

      {/* ── Font ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Font</Label>
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
                  <span className="absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check size={10} strokeWidth={3.5} />
                  </span>
                )}
                <span
                  className="text-2xl font-semibold leading-none text-foreground"
                  style={{ fontFamily }}
                  aria-hidden="true"
                >
                  Aa
                </span>
                <span className="text-[0.8125rem] font-bold leading-none text-foreground">{label}</span>
                <span className="text-[0.6875rem] leading-snug text-muted-foreground">{description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sudut komponen ───────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label>Sudut Komponen</Label>
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
                <div
                  className={`h-8 w-8 border-2 ${selected ? 'border-primary' : 'border-muted-foreground/35'}`}
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

      {/* ── Reset ────────────────────────────────────────────────────────── */}
      <div className="space-y-2 pt-1">
        <button
          type="button"
          onClick={handleReset}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-destructive/25 bg-destructive/5 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 active:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          <RotateCcw size={15} strokeWidth={2.4} />
          Kembalikan ke Default
        </button>
        <p className="px-1 text-center text-[0.6875rem] font-medium leading-relaxed text-muted-foreground">
          Mengembalikan tema, warna, font, ukuran teks, kerapatan, animasi, dan transparansi ke pengaturan awal.
        </p>
      </div>

    </div>
  );
}
