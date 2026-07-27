import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useLocation } from 'wouter';
import { apiDelete, apiGet } from '@/lib/apiClient';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  LogOut,
  Check,
  ExternalLink,
  Loader2,
  Chrome,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Unlink,
  WifiOff,
} from 'lucide-react';
import { toast } from 'sonner';

// Translate raw API error codes / fetch error strings into user-friendly
// Indonesian messages shown in the connect-button toast.
function translateConnectError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === 'SERVER_NOT_DEPLOYED') {
    return 'Server API belum aktif di Vercel. Lakukan deploy ulang project api-server di dashboard Vercel.';
  }
  if (msg === 'NETWORK_ERROR') {
    return 'Tidak dapat menghubungi server API. Periksa koneksi internet atau pastikan server sudah aktif.';
  }
  if (msg === 'CORS_BLOCKED') {
    return 'Permintaan diblokir CORS. Pastikan ALLOWED_ORIGINS di api-server sudah mencantumkan domain frontend.';
  }
  if (msg === 'WRONG_RESPONSE_HTML') {
    return 'Frontend menerima HTML, bukan JSON. Biasanya ini karena VITE_API_SERVER_URL di Vercel belum di-set atau salah — pastikan mengarah ke URL api-server (https://teman-nyatet-api-server.vercel.app), BUKAN ke domain frontend.';
  }
  if (msg.includes('status 404')) {
    return 'Server API tidak ditemukan (404). Pastikan VITE_API_SERVER_URL sudah di-set di Vercel frontend, atau api-server sudah ter-deploy.';
  }
  if (msg.includes('status 5')) {
    return `Server API error (${msg}). Periksa log Vercel api-server untuk detail.`;
  }
  return msg;
}
import { motion, AnimatePresence } from 'framer-motion';

interface GoogleStatus {
  connected: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  redirectUri?: string | null;
}

// Error messages surfaced via ?error= query param from the OAuth callback.
const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  GOOGLE_NOT_CONNECTED: {
    title: 'Google Drive belum terhubung',
    body: 'Hubungkan Google Drive kamu untuk menggunakan fitur ini.',
  },
  SPREADSHEET_NOT_CONNECTED: {
    title: 'Spreadsheet belum siap',
    body: 'Terjadi masalah saat menyiapkan spreadsheet. Coba hubungkan ulang Google Drive.',
  },
  OAUTH_DENIED: {
    title: 'Izin ditolak',
    body: 'Kamu membatalkan proses koneksi Google. Coba lagi dan pilih "Izinkan" untuk melanjutkan.',
  },
  OAUTH_STATE_INVALID: {
    title: 'Sesi kedaluwarsa',
    body: 'Link otorisasi sudah tidak valid. Mulai ulang proses koneksi dari awal.',
  },
  NO_REFRESH_TOKEN: {
    title: 'Perlu izin ulang',
    body: 'Google tidak mengirim token akses. Klik tombol di bawah dan pilih akun Google-mu, lalu klik "Lanjutkan" di halaman izin.',
  },
  OAUTH_FAILED: {
    title: 'Koneksi gagal',
    body: 'Terjadi kesalahan saat menghubungkan Google Drive. Coba lagi dalam beberapa saat.',
  },
  SPREADSHEET_NOT_FOUND: {
    title: 'Spreadsheet tidak ditemukan',
    body: 'Spreadsheet yang tersimpan tidak dapat ditemukan — mungkin sudah dihapus. Hubungkan ulang Google Drive untuk membuat yang baru.',
  },
  SPREADSHEET_ACCESS_DENIED: {
    title: 'Akses dicabut',
    body: 'TemanNyatet tidak lagi memiliki akses ke Google Drive kamu. Hubungkan ulang untuk memulihkan akses.',
  },
};

export default function ConnectSheetPage() {
  const { refreshProfile } = useAuthContext();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  // Set when the API server itself is unreachable — shown as a persistent banner
  // so the user (or developer) knows the root cause before clicking anything.
  const [apiServerError, setApiServerError] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const connectedParam = params.get('connected');
  const errorParam = params.get('error');
  const recoveryInfo = errorParam ? ERROR_MESSAGES[errorParam] ?? null : null;

  const refreshProfileRef = useRef(refreshProfile);
  refreshProfileRef.current = refreshProfile;

  const loadStatus = async (): Promise<GoogleStatus | null> => {
    try {
      const data = await apiGet<GoogleStatus>('/auth/google/status');
      setApiServerError(null); // clear any previous server-unreachable banner
      setStatus(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Surface infra-level errors (server not deployed, network, CORS) as a
      // persistent banner so the user knows the root cause immediately.
      if (
        msg === 'SERVER_NOT_DEPLOYED' ||
        msg === 'NETWORK_ERROR' ||
        msg === 'CORS_BLOCKED' ||
        msg === 'WRONG_RESPONSE_HTML' ||
        msg.includes('status 404') ||
        msg.includes('status 5')
      ) {
        setApiServerError(translateConnectError(err));
      }
      return null;
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If redirected back from OAuth with ?connected=true, poll the API server until
  // it confirms the connection, then refresh the profile and navigate. We poll
  // /auth/google/status (the source of truth) because the previous "fire once at
  // 1.2s" approach could leave the user stuck on "Mengalihkan ke aplikasi..." if
  // the Supabase profile fetch was delayed by a slow mobile network or
  // backgrounded tab.
  useEffect(() => {
    if (connectedParam !== 'true') return;
    setIsNavigating(true);

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshAndGo = async () => {
      try {
        await refreshProfileRef.current();
      } catch {
        // Swallow — AuthContext logs warnings; AuthGuard will skip the redirect
        // if the profile fetch returns null.
      }
      if (cancelled) return;
      // Force the navigation explicitly so we're not solely dependent on
      // AuthGuard's effect — gives us a guaranteed escape hatch even if the
      // profile state hasn't propagated yet.
      setLocation('/catatan');
    };

    const checkAndProceed = async (attempt: number) => {
      if (cancelled) return;
      const result = await loadStatus();
      if (result?.connected) {
        refreshAndGo();
        return;
      }
      // After ~10s of polling without success, give up the wait and force-fetch
      // the profile anyway — the user already saw "Berhasil!" so they shouldn't
      // be stranded.
      if (attempt >= 10) {
        refreshAndGo();
        return;
      }
      pollTimer = setTimeout(() => checkAndProceed(attempt + 1), 1000);
    };

    checkAndProceed(0);

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, [connectedParam, setLocation]);

  const handleManualContinue = async () => {
    setIsNavigating(true);
    try {
      await refreshProfileRef.current();
    } catch {
      // ignore — see effect above
    }
    setLocation('/catatan');
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      // Get the OAuth URL from the backend, then redirect the browser there.
      // Server-side response shape: { data: { url } }; apiClient auto-unwraps
      // `data.data` so this returns { url: string }.
      const data = await apiGet<{ url: string }>('/auth/google/initiate');
      if (!data?.url) {
        const message = 'Server tidak mengembalikan tautan Google. Periksa konfigurasi GOOGLE_CLIENT_ID di api-server.';
        console.error('[handleConnect] /auth/google/initiate returned no url', data);
        toast.error(message);
        setConnecting(false);
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      const detail = translateConnectError(err);
      console.error('[handleConnect] /auth/google/initiate failed:', err);
      // Also update the banner so the persistent state reflects the failure.
      setApiServerError(detail);
      toast.error(detail);
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiDelete('/auth/google/disconnect');
      setStatus({ connected: false, spreadsheetId: null, spreadsheetUrl: null });
      setShowDisconnect(false);
      toast.success('Google Drive berhasil diputus.');
    } catch {
      toast.error('Gagal memutus koneksi. Coba lagi.');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loadingStatus) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background to-secondary/30 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <AnimatePresence>
        {!isNavigating && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="relative w-full max-w-md bg-card/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-border p-6 sm:p-8"
          >
            {/* API server unreachable banner — shown when the health/status check
                fails at the infra level (server not deployed, CORS, network). */}
            <AnimatePresence>
              {apiServerError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 flex gap-3 bg-orange-500/10 border border-orange-500/25 rounded-2xl p-4 shadow-elevation-1"
                >
                  <WifiOff size={18} className="flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">
                      Server API tidak dapat diakses
                    </p>
                    <p className="text-xs text-orange-700/80 dark:text-orange-300/80 mt-0.5 leading-relaxed">
                      {apiServerError}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error / recovery alert */}
            <AnimatePresence>
              {recoveryInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-5 flex gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl p-4 shadow-elevation-1"
                >
                  <AlertTriangle size={18} className="flex-shrink-0 text-destructive mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">{recoveryInfo.title}</p>
                    <p className="text-xs text-destructive/80 mt-0.5 leading-relaxed">{recoveryInfo.body}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-7">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-elevation-2 text-primary-foreground">
                <ShieldCheck size={28} />
              </div>
              <h1 className="text-page-title">
                {status?.connected ? 'Google Drive Terhubung' : 'Hubungkan Google Drive'}
              </h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-xs leading-relaxed">
                {status?.connected
                  ? 'Catatan, keuangan, todo, dan link-mu tersimpan aman di Google Spreadsheet pribadimu.'
                  : 'Data kamu disimpan di Google Spreadsheet milikmu sendiri — bukan di server kami. Hubungkan Google Drive untuk memulai.'}
              </p>
            </div>

            {status?.connected && !showDisconnect ? (
              // ── Connected state ──────────────────────────────────────────────
              <div className="space-y-3">
                <a
                  href={status.spreadsheetUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full min-h-12 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-xl shadow-elevation-1 hover:opacity-90 transition-opacity"
                >
                  Buka Spreadsheet <ExternalLink size={16} />
                </a>

                <div className="flex gap-2">
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex-1 min-h-11 flex items-center justify-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-xl py-2.5 transition-colors hover:bg-secondary/50 disabled:opacity-50"
                  >
                    {connecting ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Hubungkan Ulang
                  </button>
                  <button
                    onClick={() => setShowDisconnect(true)}
                    className="flex-1 min-h-11 flex items-center justify-center gap-1.5 text-sm font-medium text-destructive/70 hover:text-destructive border border-border rounded-xl py-2.5 transition-colors hover:bg-destructive/5"
                  >
                    <Unlink size={14} /> Putuskan
                  </button>
                </div>
              </div>
            ) : status?.connected && showDisconnect ? (
              // ── Disconnect confirm ───────────────────────────────────────────
              <div className="space-y-3">
                <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 text-center">
                  <AlertCircle size={20} className="mx-auto text-destructive mb-2" />
                  <p className="text-sm font-semibold text-destructive">Putuskan Google Drive?</p>
                  <p className="text-xs text-destructive/80 mt-1 leading-relaxed">
                    Data di spreadsheet-mu tidak akan terhapus, tapi kamu perlu hubungkan ulang untuk mengakses app.
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={disconnecting}
                  className="w-full min-h-12 bg-destructive text-destructive-foreground font-semibold py-3 px-4 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {disconnecting ? <Loader2 size={16} className="animate-spin" /> : <Unlink size={16} />}
                  {disconnecting ? 'Memutus...' : 'Ya, Putuskan'}
                </button>
                <button
                  onClick={() => setShowDisconnect(false)}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                >
                  Batal
                </button>
              </div>
            ) : (
              // ── Not connected — main connect CTA ────────────────────────────
              <div className="space-y-4">
                {/* Privacy callout */}
                 <div className="bg-secondary/50 border border-border rounded-2xl p-4 space-y-2 shadow-elevation-1">
                  <div className="flex items-start gap-2.5">
                    <Check size={15} className="flex-shrink-0 text-primary mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Spreadsheet dibuat otomatis di <span className="font-medium text-foreground">Google Drive-mu sendiri</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check size={15} className="flex-shrink-0 text-primary mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Kami hanya minta akses ke file yang kami buat — bukan seluruh Drive-mu
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Check size={15} className="flex-shrink-0 text-primary mt-0.5" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Data tidak pernah melewati server kami — langsung ke spreadsheet-mu
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={connecting}
                   className="w-full min-h-12 bg-primary text-primary-foreground font-semibold py-3.5 px-4 rounded-xl shadow-elevation-1 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2.5"
                >
                  {connecting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Menghubungkan...
                    </>
                  ) : (
                    <>
                      <Chrome size={18} /> Hubungkan Google Drive
                    </>
                  )}
                </button>

                {status?.redirectUri && (
                  <div className="bg-muted/50 border border-border rounded-2xl p-3 sm:p-4">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                      Redirect URI untuk Google Cloud Console
                    </p>
                    <div className="flex items-stretch gap-2">
                      <code className="text-xs sm:text-[13px] text-foreground break-all flex-1 bg-background rounded px-2.5 py-2 font-mono leading-relaxed">
                        {status.redirectUri}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(status.redirectUri || '');
                          toast.success('URI disalin ke clipboard');
                        }}
                        className="flex-shrink-0 min-h-11 px-3 rounded-lg text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 active:scale-95 transition-all"
                      >
                        Salin
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2.5 leading-relaxed">
                      Pastikan URI di atas <strong>persis sama</strong> (termasuk https:// dan / di akhir) dengan yang didaftarkan di Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-border flex items-center justify-center">
              <button
                onClick={handleLogout}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
              >
                <LogOut size={16} /> Keluar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success overlay — shown while profile is refreshing and routing to app */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6"
          >
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mb-4 shadow-xl text-primary-foreground">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
              >
                <Check size={36} strokeWidth={3} />
              </motion.div>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Berhasil!</h2>
            <p className="text-muted-foreground text-sm mb-4 text-center max-w-xs">
              Google Drive terhubung. Spreadsheet pribadi kamu sudah siap.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Mengalihkan ke aplikasi...
            </div>

            {/* Fallback: if the auto-redirect stalls (slow network, backgrounded
                tab), let the user tap "Lanjut ke Aplikasi" to force the move.
                Without this, a user could be stranded on this screen forever. */}
            <button
              onClick={handleManualContinue}
              className="mt-6 text-sm font-medium text-primary hover:underline"
            >
              Lanjut ke Aplikasi
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
