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
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className="absolute left-4 text-muted-foreground/60" size={20} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white dark:bg-card rounded-full pl-12 pr-12 py-3.5 text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm border border-border focus:border-primary/30 transition-all placeholder:text-muted-foreground/50"
      />
      {value && (
        <button
          type="button"
          aria-label="Hapus pencarian"
          onClick={() => onChange('')}
          // min-h/min-w 40 → ~ min-h-44 with default browser touch hit-area,
          // meets WCAG 2.5.5 / Apple HIG 44pt guidance on mobile.
          className="absolute right-2 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full text-muted-foreground hover:bg-muted active:bg-muted/70 transition-colors
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:bg-muted"
        >
          <X size={16} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}
