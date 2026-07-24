import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { type ThemeMode, useTheme } from '@/hooks/useTheme';

/**
 * Three-button segmented control for choosing app theme.
 *
 * Visual anatomy:
 *   - One neutral container (`bg-secondary`) wrapping three equal-width
 *     radio cells. The selected cell lifts to `bg-card` with a soft shadow,
 *     so the user can read the choice at a glance.
 *   - Each cell stacks a 14px lucide icon over a small Indonesian label.
 *   - Focus ring matches the rest of the SettingsSheet drawer buttons.
 *   - `role="radiogroup"` + per-cell `role="radio"` + `aria-checked` so
 *     screen readers announce "Gelap, selected" instead of three separate
 *     "button" announcements.
 *
 * Why Indonesian labels (Terang / Gelap / Sistem):
 *   Matches the rest of the app; doesn't introduce a fourth language.
 */
const OPTIONS: ReadonlyArray<{ value: ThemeMode; label: string; Icon: LucideIcon }> = [
  { value: 'light', label: 'Terang', Icon: Sun },
  { value: 'dark', label: 'Gelap', Icon: Moon },
  { value: 'system', label: 'Sistem', Icon: Monitor },
];

export function ThemeToggle() {
  const { mode, setMode } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Tema aplikasi"
      className="grid grid-cols-3 gap-[clamp(0.25rem,1vw,0.5rem)] bg-secondary rounded-[clamp(0.75rem,3vw,1.25rem)] p-[clamp(0.25rem,1vw,0.5rem)]"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = mode === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => setMode(value)}
            className={
              'flex flex-col items-center justify-center gap-1 py-[clamp(0.5rem,2vw,0.75rem)] rounded-[clamp(0.5rem,2vw,0.875rem)] transition-colors text-[clamp(0.6875rem,2vw,0.8125rem)] font-bold ' +
              (selected
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground') +
              ' focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-secondary'
            }
          >
            <Icon size={14} strokeWidth={2.5} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
