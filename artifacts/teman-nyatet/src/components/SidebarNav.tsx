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
    <aside className="sticky top-0 hidden h-dvh min-h-dvh w-64 shrink-0 flex-col border-r border-border/70 bg-card/75 backdrop-blur-xl lg:flex xl:w-72 2xl:w-80">
      {/* Brand */}
      <div className="px-6 pb-6 pt-8">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          TemanNyatet
        </p>
        <h1 className="text-xl font-bold leading-tight tracking-[-0.03em] text-foreground xl:text-[1.4rem]">
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
              className={`flex min-h-11 select-none items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:translate-x-0.5 hover:bg-muted/80 hover:text-foreground'
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
      <div className="px-3 mb-4">
        {createSection && (
          <button
            onClick={() => triggerCreate(createSection)}
            className="transition-press flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-elevation-1
                       hover:bg-primary/90 active:scale-[0.98]
                       duration-150
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
                       focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            <Plus size={16} strokeWidth={2.5} />
            Tambah Baru
          </button>
        )}
      </div>

      {/* Settings — avatar at the bottom */}
      <div className="px-3 pb-6 border-t border-border/60 pt-5">
        <div className="flex items-center gap-3">
          <SettingsSheet
            avatarBg={settingsAvatarBg}
            avatarTextColor={settingsAvatarColor}
            viewport="desktop"
          />
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
