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
        className="w-full bg-white rounded-full pl-12 pr-12 py-3.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm border border-border focus:border-primary/30 transition-all placeholder:text-muted-foreground/50"
      />
      {value && (
        <button 
          onClick={() => onChange('')}
          className="absolute right-3 p-1.5 rounded-full text-muted-foreground hover:bg-muted"
        >
          <X size={16} strokeWidth={3} />
        </button>
      )}
    </div>
  );
}
