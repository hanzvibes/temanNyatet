// Desktop-only left sidebar navigation.
// Hidden on mobile and tablet (<lg) — BottomSheetNav handles those viewports.
import { Link, useLocation } from 'wouter';
import { NotebookPen, Wallet, CheckSquare, Link2, Plus } from 'lucide-react';
import { useCreate, CreateSection } from '@/contexts/CreateContext';
import SettingsSheet from '@/components/SettingsSheet';
import { useAuthContext } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { name: 'Catatan',    path: '/catatan',   icon: NotebookPen, create: 'note'     as CreateSection, color: 'text-primary' },
  { name: 'Keuangan',  path: '/keuangan',  icon: Wallet,      create: 'keuangan' as CreateSection, color: 'text-finance-text' },
  { name: 'To-do',     path: '/todo',      icon: CheckSquare, create: 'todo'     as CreateSection, color: 'text-todo-text' },
  { name: 'Link Saver',path: '/linksaver', icon: Link2,        create: 'link'     as CreateSection, color: 'text-linksaver-text' },
];

function resolveCreate(pathname: string): CreateSection {
  if (pathname.startsWith('/catatan'))   return 'note';
  if (pathname.startsWith('/keuangan'))  return 'keuangan';
  if (pathname.startsWith('/todo'))      return 'todo';
  if (pathname.startsWith('/linksaver')) return 'link';
  return null;
}

export default function SidebarNav() {
  const [location] = useLocation();
  const { triggerCreate } = useCreate();
  const { profile } = useAuthContext();
  const createSection = resolveCreate(location);

  const activeItem = NAV_ITEMS.find(n => location.startsWith(n.path));
  const settingsAvatarBg = activeItem
    ? { '/catatan': 'bg-primary/10', '/keuangan': 'bg-finance/15', '/todo': 'bg-todo/15', '/linksaver': 'bg-linksaver/15' }[activeItem.path] ?? 'bg-primary/10'
    : 'bg-primary/10';
  const settingsAvatarColor = activeItem
    ? { '/catatan': 'text-primary', '/keuangan': 'text-finance-text', '/todo': 'text-todo-text', '/linksaver': 'text-linksaver-text' }[activeItem.path] ?? 'text-primary'
    : 'text-primary';

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-dvh bg-card border-r border-border/40 sticky top-0 h-dvh shrink-0">
      {/* Brand */}
      <div className="px-5 pt-7 pb-6">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 mb-1">
          TemanNyatet
        </p>
        <h1 className="text-xl font-bold text-foreground leading-tight">
          Sat-set, beres! ✓
        </h1>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = location.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-semibold select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.5 : 2} className={isActive ? '' : item.color} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Create button — only shown when on a data page */}
      <div className="px-3 mb-3">
        {createSection && (
          <button
            onClick={() => triggerCreate(createSection)}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground
                       rounded-xl py-2.5 font-semibold text-sm hover:bg-primary/90 active:scale-[0.98]
                       transition-all duration-150 shadow-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                       focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <Plus size={16} strokeWidth={2.5} />
            Tambah Baru
          </button>
        )}
      </div>

      {/* Settings — avatar at the bottom */}
      <div className="px-3 pb-5 border-t border-border/30 pt-4">
        <div className="flex items-center gap-3">
          <SettingsSheet avatarBg={settingsAvatarBg} avatarTextColor={settingsAvatarColor} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {profile?.name ?? 'Pengaturan'}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {profile?.subscription_status === 'active' ? 'Aktif ✓' : profile?.subscription_status}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
