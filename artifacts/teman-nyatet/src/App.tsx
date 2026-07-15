import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { AuthProvider, useAuthContext } from '@/contexts/AuthContext';
import { CreateProvider } from '@/contexts/CreateContext';
import { Loader2 } from 'lucide-react';
import React, { useEffect } from 'react';

import AuthPage from '@/pages/AuthPage';
import PaymentPage from '@/pages/PaymentPage';
import ArchivedPage from '@/pages/ArchivedPage';
import ConnectSheetPage from '@/pages/ConnectSheetPage';
import CatatanPage from '@/pages/CatatanPage';
import KeuanganPage from '@/pages/KeuanganPage';
import TodoPage from '@/pages/TodoPage';
import LinkSaverPage from '@/pages/LinkSaverPage';
import BottomSheetNav from '@/components/BottomSheetNav';

const queryClient = new QueryClient();

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

  return (
    <div className="max-w-md mx-auto bg-background min-h-dvh shadow-2xl relative overflow-hidden">
      {children}
      {showNav && <BottomSheetNav />}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={AuthPage} />
      <Route path="/payment" component={PaymentPage} />
      <Route path="/archived" component={ArchivedPage} />
      <Route path="/connect-sheet" component={ConnectSheetPage} />

      <Route path="/catatan" component={CatatanPage} />
      <Route path="/keuangan" component={KeuanganPage} />
      <Route path="/todo" component={TodoPage} />
      <Route path="/linksaver" component={LinkSaverPage} />

      <Route path="/" component={() => null} />
      <Route component={NotFound} />
    </Switch>
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
                  <Router />
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
