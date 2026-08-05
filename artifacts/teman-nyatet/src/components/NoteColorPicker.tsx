import { getNoteColor, NOTE_COLORS } from '@/lib/noteColors';

interface NoteColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export default function NoteColorPicker({ value, onChange }: NoteColorPickerProps) {
  return (
    <div>
      <label className="text-pill-label mb-3 block opacity-70">Warna Catatan</label>
      <div className="flex gap-2.5">
        {NOTE_COLORS.map(({ value: colorValue, label }) => {
          const isSelected = value === colorValue;
          return (
            <button
              key={colorValue}
              type="button"
              aria-label={`Warna ${label}${isSelected ? ', dipilih' : ''}`}
              aria-pressed={isSelected}
              onClick={() => onChange(colorValue)}
              className={[
                'h-10 w-10 min-h-[44px] min-w-[44px] rounded-full border-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected
                  ? 'ring-2 ring-foreground/55 ring-offset-2 scale-[1.12]'
                  : 'hover:scale-[1.06]',
              ].join(' ')}
              style={{
                backgroundColor: colorValue,
                borderColor: `color-mix(in srgb, ${getNoteColor(colorValue).border} 80%, transparent)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}