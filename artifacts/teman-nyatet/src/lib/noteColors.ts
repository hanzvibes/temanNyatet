export const NOTE_COLORS = [
  {
    value: 'var(--note-card-1)',
    label: 'Sage',
    foreground: 'var(--note-card-1-foreground)',
    border: 'var(--note-card-1-border)',
  },
  {
    value: 'var(--note-card-2)',
    label: 'Kuning lembut',
    foreground: 'var(--note-card-2-foreground)',
    border: 'var(--note-card-2-border)',
  },
  {
    value: 'var(--note-card-3)',
    label: 'Biru lembut',
    foreground: 'var(--note-card-3-foreground)',
    border: 'var(--note-card-3-border)',
  },
  {
    value: 'var(--note-card-4)',
    label: 'Coral lembut',
    foreground: 'var(--note-card-4-foreground)',
    border: 'var(--note-card-4-border)',
  },
] as const;

export const NOTE_COLOR_PALETTE = NOTE_COLORS.map(({ value }) => value);

export type NoteColor = (typeof NOTE_COLORS)[number];

export function getNoteColor(color?: string | null): NoteColor {
  return NOTE_COLORS.find((noteColor) => noteColor.value === color) ?? NOTE_COLORS[0];
}