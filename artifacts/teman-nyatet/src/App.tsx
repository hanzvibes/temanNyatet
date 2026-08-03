import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router as WouterRouter, useLocation } from 'wouter';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import { CreateProvider } from '@/contexts/CreateContext';
import { Loader2 } from 'lucide-react';
import React, { Suspense, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useOrientation } from '@/hooks/useOrientation';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import PwaUpdatePrompt from '@/components/PwaUpdatePrompt';
import OfflineIndicator from '@/components/OfflineIndicator';

// Lazy load pages so the initial JS bundle stays small. This improves first
// paint on slow mobile networks (especially iPhone on 3G/4G) and avoids a
// long white screen during PWA launch.
const AuthPage = React.lazy(() => import('@/pages/AuthPage'));
const AuthConfirmPage = React.lazy(() => import('@/pages/AuthConfirmPage'));
const LegalPage = React.lazy(() => import('@/pages/LegalPage'));
const PaymentPage = React.lazy(() => import('@/pages/PaymentPage'));
const SubscriptionPage = React.lazy(() => import('@/pages/SubscriptionPage'));
const ArchivedPage = React.lazy(() => import('@/pages/ArchivedPage'));
const ConnectSheetPage = React.lazy(() => import('@/pages/ConnectSheetPage'));
const CatatanPage = React.lazy(() => import('@/pages/CatatanPage'));
const KeuanganPage = React.lazy(() => import('@/pages/KeuanganPage'));
const TodoPage = React.lazy(() => import('@/pages/TodoPage'));
const LinkSaverPage = React.lazy(() => import('@/pages/LinkSaverPage'));
const BottomSheetNav = React.lazy(() => import('@/components/BottomSheetNav'));
const SidebarNav = React.lazy(() => import('@/components/SidebarNav'));
const Toaster = React.lazy(() =>
  import('@/components/ui/sonner').then(({ Toaster: Component }) => ({
    default: Component,
  })),
);

function logClientError(event: string, error: unknown, context?: string) {
  console.error(JSON.stringify({
    scope: 'client',
    event,
    message: error instanceof Error ? error.message : String(error),
    ...(context ? { context } : {}),
  }));
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep recently visited pages instant without constantly re-requesting
      // the same data on tab switches.
      staleTime: 60_000,
      // Preserve cache data after a route unmounts so returning to a tab paints
      // immediately while the next request refreshes it in the background.
      gcTime: 30 * 60 * 1000,
      // Focus events are noisy on mobile (keyboard, app switcher, PWA resume).
      // Re-fetching every time creates visible loading churn and unnecessary
      // API work; reconnect still refreshes stale data when connectivity returns.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      // One retry on transient network errors; cached data remains usable while
      // the retry happens.
      retry: 1,
    },
  },
});

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    logClientError('render_failed', error, info.componentStack ?? undefined);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-dvh items-center justify-center bg-background px-6 text-center">
          <div className="max-w-sm space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
              <span className="text-2xl" aria-hidden="true">!</span>
            </div>
            <h1 className="text-section-title">TemanNyatet perlu dimuat ulang</h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Terjadi masalah saat menampilkan halaman ini. Data kamu tetap aman.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="min-h-11 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
            >
              Muat ulang
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

// ── Route table ───────────────────────────────────────────────────────────
// Single list of all app pages. Adding a new page is one entry here; the
// rest of the routing machinery (CachedSwitch, AuthGuard redirects,
// BottomSheetNav tabs) follows automatically.
function PrivacyPolicyPage() {
  return <LegalPage policy="privacy" />;
}

function TermsOfServicePage() {
  return <LegalPage policy="terms" />;
}

const ROUTE_ENTRIES: Array<{ path: string; component: React.ComponentType }> = [
  { path: '/login',         component: AuthPage         },
  { path: '/auth/confirm',  component: AuthConfirmPage  },
  { path: '/privacy-policy', component: PrivacyPolicyPage },
  { path: '/terms-of-service', component: TermsOfServicePage },
  { path: '/payment',       component: PaymentPage      },
  { path: '/subscription',  component: SubscriptionPage },
  { path: '/archived',      component: ArchivedPage     },
  { path: '/connect-sheet', component: ConnectSheetPage },
  { path: '/catatan',       component: CatatanPage      },
  { path: '/keuangan',      component: KeuanganPage     },
  { path: '/todo',          component: TodoPage         },
  { path: '/linksaver',     component: LinkSaverPage    },
];
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuthContext();
  const [location, setLocation] = useLocation();

  const PUBLIC_ROUTES = new Set(['/login', '/auth/confirm', '/privacy-policy', '/terms-of-service']);
  const PUBLIC_LEGAL_ROUTES = new Set(['/privacy-policy', '/terms-of-service']);

  // Legal pages do not require a session. Render them while Supabase is still
  // checking auth so Google's crawler and users never wait on an unrelated
  // auth/network request before seeing the policy.
  useEffect(() => {
    if (loading) return;
    if (PUBLIC_LEGAL_ROUTES.has(location)) return;

    if (!user) {
      if (!PUBLIC_ROUTES.has(location)) setLocation('/login');
      return;
    }

    if (profile) {
      if (
        profile.subscription_status === 'pending'
        && location !== '/payment'
        && location !== '/subscription'
      ) {
        setLocation('/payment');
      } else if (
        profile.subscription_status === 'archived'
        && location !== '/archived'
        && location !== '/subscription'
      ) {
        setLocation('/archived');
      } else if (profile.subscription_status === 'active') {
        // Auth-only pages that active users must be redirected away from.
        // These exist in ROUTE_ENTRIES (so !matched alone won't catch them),
        // but an active user has no reason to be on them.
        //
        // /connect-sheet is intentionally NOT in this set: an active user
        // navigates there voluntarily from Settings → "Spreadsheet Saya" to
        // reconnect, disconnect, or check their spreadsheet. The
        // `if (!profile.spreadsheet_id)` branch above already handles the
        // involuntary case (first-time connect after login).
        const AUTH_ONLY_ROUTES = new Set(['/login', '/payment', '/archived']);
        const matched = ROUTE_ENTRIES.find((e) => e.path === location);
        if (!matched || AUTH_ONLY_ROUTES.has(location)) {
          setLocation('/catatan');
        }
      }
    }
  }, [user, profile, loading, location, setLocation]);

  if (PUBLIC_LEGAL_ROUTES.has(location)) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-dvh w-full flex flex-col items-center justify-center gap-3 bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-xs font-semibold text-muted-foreground tracking-wide">Memuat…</p>
      </div>
    );
  }

  return <>{children}</>;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuthContext();
  const [location] = useLocation();
  const showNav = user && profile?.subscription_status === 'active';
  const { isLandscape } = useOrientation();
  const isSubscriptionPage = location === '/subscription';

  // Unauthenticated / onboarding pages (login, payment, connect-sheet, archived):
  // narrow centered card — keeps the mobile-app feel on all screen sizes.
  // In landscape, allow the card to scroll if the viewport is short instead of
  // centering with huge margins that can push content off-screen.
  if (!showNav && !isSubscriptionPage) {
    return (
      <div className={`
        max-w-md mx-auto bg-background min-h-dvh sm:shadow-2xl relative overflow-x-hidden
        landscape:overflow-y-auto landscape:justify-start landscape:pt-[max(1.5rem,env(safe-area-inset-top))]
      `}>
        {children}
      </div>
    );
  }

  // Authenticated + active subscription: sidebar on desktop, full-width on mobile/tablet.
  // In landscape, force the layout row to fill the dynamic viewport so the
  // bottom sheet never shrinks the main content.
  return (
    <div className={`
      min-h-dvh bg-background lg:flex
      ${isLandscape ? 'landscape:flex' : ''}
    `}>
      {/* Fixed left sidebar — only rendered (and visible) on lg+ */}
      <Suspense fallback={null}>
        <SidebarNav />
      </Suspense>

      {/* Main content area — takes remaining width on desktop */}
      <main className="flex-1 min-w-0 relative overflow-x-hidden bg-background">
        {children}
        {/* Bottom sheet nav — hidden on desktop via lg:hidden inside the component */}
        <Suspense fallback={null}>
          <BottomSheetNav />
        </Suspense>
      </main>
    </div>
  );
}

function PageLoading() {
  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      <p className="text-xs font-semibold text-muted-foreground tracking-wide">Memuat…</p>
    </div>
  );
}

// ── Lightweight route switch ─────────────────────────────────────────────
// Only the active page is mounted. Keeping every visited page alive made the
// app progressively more expensive during a session: all hidden pages kept
// effects, subscriptions, motion values, and event listeners running. React
// Query's cache now provides the instant return path without that memory and
// CPU cost.
function Router() {
  const [location] = useLocation();

  // Reset scroll on every navigation so newly-shown pages always start at the
  // top. Without this, every page shares one document scroll position and a
  // long Catatan listing would leave Keuangan scrolled into the middle.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location]);

  const activeKey = ROUTE_ENTRIES.find(e => e.path === location)?.path;
  const activeEntry = ROUTE_ENTRIES.find(e => e.path === activeKey);

  // AuthGuard redirects unknown URLs according to the user's current access
  // state. Keep a visible loading state during that navigation. Returning
  // null here made a cold start at "/" look like a blank page until the
  // redirect effect ran.
  if (!activeKey) return <PageLoading />;

  return (
    <RouteSlot key={activeKey}>
      {React.createElement(activeEntry!.component)}
    </RouteSlot>
  );
}

// One route = one active wrapper. The page unmounts when navigating away, while
// React Query retains its data cache so returning to it can paint immediately.
function RouteSlot({
  children,
}: {
  children: React.ReactNode;
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.div
      className="will-change-[transform,opacity]"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
    >
      <Suspense fallback={<PageLoading />}>{children}</Suspense>
    </motion.div>
  );
}

function AppContent() {
  return (
    <QueryClientProvider client={queryClient}>
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
      <Suspense fallback={null}>
        <Toaster />
      </Suspense>
    </QueryClientProvider>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}
