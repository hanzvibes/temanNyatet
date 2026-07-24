// Desktop-only left sidebar navigation.
// Hidden on mobile and tablet (<lg) — BottomSheetNav handles those viewports.
import { Link, useLocation } from 'wouter';
import { NotebookPen, Wallet, CheckSquare, Link2, Plus } from 'lucide-react';
import { useCreate, CreateSection } from '@/contexts/CreateContext';
import SettingsSheet from '@/components/SettingsSheet';
import { useAuthContext } from '@/contexts/AuthContext';

const NAV_ITEMS = [
  { name: 'Catatan',    path: '/catatan',   icon: NotebookPen, create: 'note'     as CreateSection, color: 'text-primary' },
  { name: 'Keuangan',  path: '/keuangan',  icon: Wallet,      create: 'keuangan' as CreateSection, color: 'text-[#F4C753]' },
  { name: 'To-do',     path: '/todo',      icon: CheckSquare, create: 'todo'     as CreateSection, color: 'text-[#9CB4D4]' },
  { name: 'Link Saver',path: '/linksaver', icon: Link2,        create: 'link'     as CreateSection, color: 'text-[#E09898]' },
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
    ? { '/catatan': 'bg-[#E8F2DF] dark:bg-[#1F2D1A]', '/keuangan': 'bg-[#FFF8D6] dark:bg-[#3D3118]', '/todo': 'bg-[#E1F0FF] dark:bg-[#1A2638]', '/linksaver': 'bg-[#FFE4E1] dark:bg-[#38201E]' }[activeItem.path] ?? 'bg-primary/10'
    : 'bg-primary/10';
  const settingsAvatarColor = activeItem
    ? { '/catatan': 'text-primary', '/keuangan': 'text-[#F4C753]', '/todo': 'text-[#9CB4D4]', '/linksaver': 'text-[#E09898]' }[activeItem.path] ?? 'text-primary'
    : 'text-primary';

  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-dvh bg-card border-r border-border/40 sticky top-0 h-dvh shrink-0">
      {/* Brand */}
      <div className="px-5 pt-7 pb-6">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/60 mb-1">
          TemanNyatet
        </p>
        <h1 className="text-xl font-extrabold text-foreground leading-tight">
          Sat-set, beres! ✓
        </h1>
      </div>

      {/* Nav links */}
      <nav className="flex flex-col gap-0.5 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = location.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-sm font-bold select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
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
                       rounded-xl py-2.5 font-bold text-sm hover:bg-primary/90 active:scale-[0.98]
                       transition-all duration-150 shadow-sm
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground
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
            <p className="text-sm font-bold text-foreground truncate">
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
