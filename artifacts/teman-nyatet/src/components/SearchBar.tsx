import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchBar({ value, onChange, placeholder = 'Cari...', className = '' }: SearchBarProps) {
  return (
    <div className={`group relative flex items-center w-full ${className}`}>
      <Search className="absolute left-4 text-muted-foreground/70 transition-colors duration-200 group-focus-within:text-primary" size={18} strokeWidth={2.25} aria-hidden="true" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full min-h-12 rounded-[0.875rem] border border-border/70 bg-card pl-12 pr-12 py-3 text-sm font-medium text-foreground shadow-elevation-1 outline-none transition-[border-color,box-shadow,background-color,transform] placeholder:text-muted-foreground/75 hover:border-border focus:border-primary/45 focus:bg-card focus:shadow-elevation-2 focus-visible:ring-2 focus-visible:ring-primary/20"
      />
      {value && (
        <button
          type="button"
          aria-label="Hapus pencarian"
          onClick={() => onChange('')}
          // min-h/min-w 40 → ~ min-h-44 with default browser touch hit-area,
          // meets WCAG 2.5.5 / Apple HIG 44pt guidance on mobile.
           className="absolute right-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted/80 active:bg-muted/70 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:bg-muted"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
