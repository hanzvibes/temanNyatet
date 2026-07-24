import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Router as WouterRouter, useLocation } from 'wouter';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import { CreateProvider } from '@/contexts/CreateContext';
import { Loader2 } from 'lucide-react';
import React, { Suspense, useEffect, useState } from 'react';

import BottomSheetNav from '@/components/BottomSheetNav';
import SidebarNav from '@/components/SidebarNav';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt';
import OfflineIndicator from '@/components/OfflineIndicator';

// Lazy load pages so the initial JS bundle stays small. This improves first
// paint on slow mobile networks (especially iPhone on 3G/4G) and avoids a
// long white screen during PWA launch.
const AuthPage = React.lazy(() => import('@/pages/AuthPage'));
const PaymentPage = React.lazy(() => import('@/pages/PaymentPage'));
const ArchivedPage = React.lazy(() => import('@/pages/ArchivedPage'));
const ConnectSheetPage = React.lazy(() => import('@/pages/ConnectSheetPage'));
const CatatanPage = React.lazy(() => import('@/pages/CatatanPage'));
const KeuanganPage = React.lazy(() => import('@/pages/KeuanganPage'));
const TodoPage = React.lazy(() => import('@/pages/TodoPage'));
const LinkSaverPage = React.lazy(() => import('@/pages/LinkSaverPage'));
const NotFound = React.lazy(() => import('@/pages/not-found'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s freshness window. While fresh, React Query treats cached data as
      // authoritative and skips refetch on remount — exactly the contract our
      // CachedSwitch below relies on for instant tab switches.
      staleTime: 30_000,
      // Retain caches 30 minutes after the last subscriber unmounts so even a
      // tab that's fully unmounted renders from cache when re-visited, while a
      // fresh fetch happens silently in the background.
      gcTime: 30 * 60 * 1000,
      // When the browser tab regains focus, refetch stale entries in the
      // background — keeps long-lived tabs honest without blocking the paint.
      // 'always' is the default; setting it makes the intent explicit.
      refetchOnWindowFocus: 'always',
      // One retry on transient network errors; we surface the cached data
      // gracefully if the network stays down.
      retry: 1,
    },
  },
});

// ── Route table ───────────────────────────────────────────────────────────
// Single list of all app pages. Adding a new page is one entry here; the
// rest of the routing machinery (CachedSwitch, AuthGuard redirects,
// BottomSheetNav tabs) follows automatically.
const ROUTE_ENTRIES: Array<{ path: string; component: React.ComponentType }> = [
  { path: '/login',         component: AuthPage         },
  { path: '/payment',       component: PaymentPage      },
  { path: '/archived',      component: ArchivedPage     },
  { path: '/connect-sheet', component: ConnectSheetPage },
  { path: '/catatan',       component: CatatanPage      },
  { path: '/keuangan',      component: KeuanganPage     },
  { path: '/todo',          component: TodoPage         },
  { path: '/linksaver',     component: LinkSaverPage    },
];
// Sentinel used for any unmatched URL. Distinct from real paths so unknown
// routes share a single NotFound instance in the rendered tree.
const NOT_FOUND_KEY = '__notfound__';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuthContext();
  const [location, setLocation] = useLocation();

  // Listen for spreadsheet access errors dispatched by data hooks.
  // When the API server returns SPREADSHEET_NOT_FOUND or
  // SPREADSHEET_ACCESS_DENIED, the hook fires this event and we redirect
  // the user to the connect/recovery page immediately.
  useEffect(() => {
    const handler = (e: Event) => {
      const code = (e as CustomEvent<{ code: string }>).detail?.code ?? 'SPREADSHEET_NOT_FOUND';
      if (location !== '/connect-sheet') {
        setLocation(`/connect-sheet?error=${code}`);
      }
    };
    window.addEventListener('teman-nyatet:spreadsheet-error', handler);
    return () => window.removeEventListener('teman-nyatet:spreadsheet-error', handler);
  }, [location, setLocation]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      if (location !== '/login') setLocation('/login');
      return;
    }

    if (profile) {
      if (!profile.spreadsheet_id) {
        // Every user (new or existing) must connect their own private Google
        // Spreadsheet before using any of the app's features.
        if (location !== '/connect-sheet') setLocation('/connect-sheet');
      } else if (profile.subscription_status === 'pending' && location !== '/payment') {
        setLocation('/payment');
      } else if (profile.subscription_status === 'archived' && location !== '/archived') {
        setLocation('/archived');
      } else if (
        profile.subscription_status === 'active' &&
        (location === '/' || location === '/login' || location === '/payment' || location === '/archived')
      ) {
        setLocation('/catatan');
      }
    }
  }, [user, profile, loading, location, setLocation]);

  if (loading) {
    return (
      <div className="min-h-dvh w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuthContext();
  const showNav = user && profile?.subscription_status === 'active';

  // Unauthenticated / onboarding pages (login, payment, connect-sheet, archived):
  // narrow centered card — keeps the mobile-app feel on all screen sizes.
  if (!showNav) {
    return (
      <div className="max-w-md mx-auto bg-background min-h-dvh sm:shadow-2xl relative overflow-hidden">
        {children}
      </div>
    );
  }

  // Authenticated + active subscription: sidebar on desktop, full-width on mobile/tablet.
  return (
    <div className="min-h-dvh bg-background lg:flex">
      {/* Fixed left sidebar — only rendered (and visible) on lg+ */}
      <SidebarNav />

      {/* Main content area — takes remaining width on desktop */}
      <main className="flex-1 min-w-0 relative overflow-x-hidden bg-background">
        {children}
        {/* Bottom sheet nav — hidden on desktop via lg:hidden inside the component */}
        <BottomSheetNav />
      </main>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="min-h-dvh w-full flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// ── Cached route switch ──────────────────────────────────────────────────
// wouter's <Switch> remounts every <Route> on each navigation, which costs:
//   • A TanStack-Query refetch of data we just fetched seconds ago (default
//     staleTime is 0, so even short back-tab trips produce network thrash)
//   • A blank-page flash while each page's hooks re-fire
//   • A lazy chunk re-evaluation pass for each visited page
//
// CachedSwitch keeps every previously-visited page mounted in the DOM (only
// the `hidden` attribute toggles), so React Query hooks keep their cache and
// returning to a page paints instantly from in-memory data. Fresh data
// revalidates in the background via `refetchOnWindowFocus` and mutation
// invalidation — never blocking the active paint.
function Router() {
  const [location] = useLocation();

  // Track visited locations so the rendered tree grows over a session rather
  // than shrinking back to one page on every nav. The 404 sentinel gets its
  // own key so unrelated unknown URLs share one NotFound mount.
  const [visited, setVisited] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    const matched = ROUTE_ENTRIES.find(e => e.path === location);
    const key = matched?.path ?? NOT_FOUND_KEY;
    setVisited(prev => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, [location]);

  // Reset scroll on every navigation so newly-shown pages always start at the
  // top. Without this, every page shares one document scroll position and a
  // long Catatan listing would leave Keuangan scrolled into the middle.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [location]);

  const activeKey =
    ROUTE_ENTRIES.find(e => e.path === location)?.path ?? NOT_FOUND_KEY;

  return (
    <>
      {ROUTE_ENTRIES.map(({ path, component: Comp }) =>
        visited.has(path) ? (
          <RouteSlot key={path} active={path === activeKey}>
            <Comp />
          </RouteSlot>
        ) : null,
      )}
      {visited.has(NOT_FOUND_KEY) && (
        <RouteSlot key={NOT_FOUND_KEY} active={activeKey === NOT_FOUND_KEY}>
          <NotFound />
        </RouteSlot>
      )}
    </>
  );
}

// One route = one always-mounted wrapper. `hidden` removes it from layout
// and paint but keeps it in the React tree, so its hooks stay alive and
// React Query keeps its cache. `aria-hidden` mirrors DOM visibility for
// screen readers.
function RouteSlot({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <div hidden={!active} aria-hidden={!active}>
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <CreateProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <AuthGuard>
                <MainLayout>
                  <OfflineIndicator />
                  <Router />
                  <PwaInstallPrompt />
                  <PwaUpdatePrompt />
                </MainLayout>
              </AuthGuard>
            </WouterRouter>
          </CreateProvider>
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
