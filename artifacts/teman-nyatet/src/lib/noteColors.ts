export const NOTE_COLORS = [
  { value: 'var(--note-card-1)', label: 'Kuning' },
  { value: 'var(--note-card-2)', label: 'Hijau' },
  { value: 'var(--note-card-3)', label: 'Merah muda' },
  { value: 'var(--note-card-4)', label: 'Biru' },
] as const;

export const NOTE_COLOR_PALETTE = NOTE_COLORS.map(({ value }) => value);