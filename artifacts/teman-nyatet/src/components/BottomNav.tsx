import React from 'react';
import { NotebookPen, Wallet, CheckSquare, Link2 } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useHaptic, HAPTIC } from '@/hooks/useHaptic';

export default function BottomNav() {
  const [location] = useLocation();
  const haptic = useHaptic();

  const navItems = [
    { name: 'Catatan', path: '/catatan', icon: NotebookPen },
    { name: 'Keuangan', path: '/keuangan', icon: Wallet },
    { name: 'To-do', path: '/todo', icon: CheckSquare },
    { name: 'Link Saver', path: '/linksaver', icon: Link2 },
  ];

  return (
    <nav className="fixed left-1/2 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm z-50" style={{ bottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <div className="bg-card rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] border border-border/50 flex justify-around items-center h-[68px] px-2">
        {navItems.map((item) => {
          const isActive = location.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => haptic(HAPTIC.tap)}
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 relative active:scale-[0.96] transition-transform duration-150"
            >
              <div className={`p-2 rounded-xl transition-all duration-200 ${isActive ? 'bg-primary/15 scale-105' : 'bg-transparent'}`}>
                <Icon
                  size={22}
                  className={isActive ? 'text-primary' : 'text-muted-foreground'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={`text-[10px] font-bold tracking-wide leading-none ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
