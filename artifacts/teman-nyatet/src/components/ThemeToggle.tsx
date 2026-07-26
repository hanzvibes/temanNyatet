import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { type ThemeMode, useTheme } from '@/hooks/useTheme';

/**
 * Three-button segmented control for choosing app theme.
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
      className="grid grid-cols-3 gap-1 bg-surface rounded-xl p-1"
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
            className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
              selected
                ? 'bg-card text-foreground shadow-sm border border-border/50'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface`}
          >
            <Icon size={16} strokeWidth={2.5} aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}
