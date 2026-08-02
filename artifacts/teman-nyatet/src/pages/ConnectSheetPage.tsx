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
  CloudUpload,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Unlink,
  WifiOff,
  ArrowLeft,
  ShieldCheck,
  FolderOpen,
  Lock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { motion, AnimatePresence } from 'framer-motion';

function translateConnectError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg === 'SERVER_NOT_DEPLOYED')
    return 'Server API belum aktif di Vercel. Lakukan deploy ulang project api-server di dashboard Vercel.';
  if (msg === 'NETWORK_ERROR')
    return 'Tidak dapat menghubungi server API. Periksa koneksi internet atau pastikan server sudah aktif.';
  if (msg === 'CORS_BLOCKED')
    return 'Permintaan diblokir CORS. Pastikan ALLOWED_ORIGINS di api-server sudah mencantumkan domain frontend.';
  if (msg === 'WRONG_RESPONSE_HTML')
    return 'Frontend menerima HTML, bukan JSON. Biasanya ini karena VITE_API_SERVER_URL di Vercel belum di-set atau salah — pastikan mengarah ke URL api-server (https://teman-nyatet-api-server.vercel.app), BUKAN ke domain frontend.';
  if (msg.includes('status 404'))
    return 'Server API tidak ditemukan (404). Pastikan VITE_API_SERVER_URL sudah di-set di Vercel frontend, atau api-server sudah ter-deploy.';
  if (msg.includes('status 5'))
    return `Server API error (${msg}). Periksa log Vercel api-server untuk detail.`;
  return msg;
}

interface GoogleStatus {
  connected: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  redirectUri?: string | null;
}

const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  GOOGLE_NOT_CONNECTED: {
    title: 'Google Drive belum terhubung',
    body: 'Hubungkan Google Drive untuk mengaktifkan fitur backup spreadsheet.',
  },
  SPREADSHEET_NOT_CONNECTED: {
    title: 'Spreadsheet belum siap',
    body: 'Terjadi masalah saat menyiapkan spreadsheet backup. Coba hubungkan ulang Google Drive.',
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

const BACKUP_BENEFITS = [
  { icon: ShieldCheck, text: 'Data kamu sudah aman di server kami — ini cuma cadangan tambahan' },
  { icon: FolderOpen,  text: 'Spreadsheet tersimpan di Google Drive-mu sendiri, mudah diakses' },
  { icon: Lock,        text: 'Kami hanya minta akses ke file yang kami buat, bukan seluruh Drive' },
];

export default function ConnectSheetPage() {
  const { refreshProfile } = useAuthContext();
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnect, setShowDisconnect] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
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
      setApiServerError(null);
      setStatus(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
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

  useEffect(() => {
    if (connectedParam !== 'true') return;
    setIsNavigating(true);

    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshAndGo = async () => {
      try { await refreshProfileRef.current(); } catch { /* see effect above */ }
      if (cancelled) return;
      setLocation('/catatan');
    };

    const checkAndProceed = async (attempt: number) => {
      if (cancelled) return;
      const result = await loadStatus();
      if (result?.connected) { refreshAndGo(); return; }
      if (attempt >= 10) { refreshAndGo(); return; }
      pollTimer = setTimeout(() => checkAndProceed(attempt + 1), 1000);
    };

    checkAndProceed(0);
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectedParam, setLocation]);

  const handleManualContinue = async () => {
    setIsNavigating(true);
    try { await refreshProfileRef.current(); } catch { /* ignore */ }
    setLocation('/catatan');
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
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
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background p-5 sm:p-6">
      {/* Background blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <AnimatePresence>
        {!isNavigating && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-card-border bg-card shadow-elevated"
          >
            {/* Alerts */}
            <AnimatePresence>
              {(apiServerError || recoveryInfo) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-b border-border"
                >
                  {apiServerError && (
                    <Alert variant="warning" className="rounded-none border-0">
                      <WifiOff aria-hidden="true" />
                      <div className="min-w-0">
                        <AlertTitle>Server API tidak dapat diakses</AlertTitle>
                        <AlertDescription>{apiServerError}</AlertDescription>
                      </div>
                    </Alert>
                  )}
                  {recoveryInfo && (
                    <Alert variant="destructive" className="rounded-none border-0">
                      <AlertTriangle aria-hidden="true" />
                      <div className="min-w-0">
                        <AlertTitle>{recoveryInfo.title}</AlertTitle>
                        <AlertDescription>{recoveryInfo.body}</AlertDescription>
                      </div>
                    </Alert>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Header */}
            <div className="border-b border-border px-6 py-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary shadow-elevation-2 text-primary-foreground">
                <CloudUpload size={22} />
              </div>
              <h1 className="text-[1.375rem] font-semibold leading-tight tracking-tight text-foreground">
                {status?.connected ? 'Backup Spreadsheet Aktif' : 'Backup ke Google Spreadsheet'}
              </h1>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {status?.connected
                  ? 'Data kamu di-backup secara otomatis ke Google Spreadsheet pribadimu.'
                  : 'Opsional: buat salinan cadangan data di Google Drive-mu sendiri.'}
              </p>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              {status?.connected && !showDisconnect ? (
                // ── Connected ──
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl bg-income/8 border border-income/20 px-4 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-income/15">
                      <Check size={15} className="text-income" strokeWidth={2.5} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Terhubung</p>
                      <p className="text-xs text-muted-foreground">Backup aktif berjalan otomatis</p>
                    </div>
                  </div>

                  <a
                    href={status.spreadsheetUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-elevation-1 transition-opacity hover:opacity-90"
                  >
                    Buka Spreadsheet <ExternalLink size={14} />
                  </a>

                  <div className="flex gap-2">
                    <button
                      onClick={handleConnect}
                      disabled={connecting}
                      className="flex flex-1 min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground disabled:opacity-50"
                    >
                      {connecting ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      Hubungkan Ulang
                    </button>
                    <button
                      onClick={() => setShowDisconnect(true)}
                      className="flex flex-1 min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border py-2 text-xs font-semibold text-destructive/70 transition-colors hover:bg-destructive/5 hover:text-destructive"
                    >
                      <Unlink size={13} /> Putuskan
                    </button>
                  </div>
                </div>
              ) : status?.connected && showDisconnect ? (
                // ── Disconnect confirm ──
                <div className="space-y-3">
                  <Alert variant="destructive">
                    <AlertCircle aria-hidden="true" />
                    <div className="min-w-0">
                      <AlertTitle>Nonaktifkan backup?</AlertTitle>
                      <AlertDescription>
                        Data di spreadsheet tidak akan terhapus. Semua fitur aplikasi tetap bisa digunakan.
                      </AlertDescription>
                    </div>
                  </Alert>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex w-full min-h-11 items-center justify-center gap-2 rounded-xl bg-destructive text-sm font-semibold text-destructive-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {disconnecting ? <Loader2 size={15} className="animate-spin" /> : <Unlink size={15} />}
                    {disconnecting ? 'Menonaktifkan...' : 'Ya, Nonaktifkan Backup'}
                  </button>
                  <button
                    onClick={() => setShowDisconnect(false)}
                    className="w-full py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                // ── Not connected ──
                <div className="space-y-4">
                  {/* Benefits */}
                  <div className="space-y-2">
                    {BACKUP_BENEFITS.map(({ icon: Icon, text }) => (
                      <div key={text} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-secondary">
                          <Icon size={13} className="text-muted-foreground" />
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="flex w-full min-h-12 items-center justify-center gap-2.5 rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-elevation-1 transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {connecting
                      ? <><Loader2 size={16} className="animate-spin" /> Menghubungkan...</>
                      : <><Chrome size={16} /> Hubungkan Google Drive</>}
                  </button>

                  {status?.redirectUri && (
                    <div className="rounded-2xl border border-border bg-secondary/40 p-3">
                      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        Redirect URI
                      </p>
                      <div className="flex items-stretch gap-2">
                        <code className="flex-1 break-all rounded-lg bg-background px-2.5 py-2 font-mono text-xs leading-relaxed text-foreground">
                          {status.redirectUri}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(status.redirectUri || '');
                            toast.success('URI disalin ke clipboard');
                          }}
                          className="shrink-0 min-h-9 rounded-lg bg-primary/10 px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                        >
                          Salin
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-6 py-4">
              <button
                onClick={() => setLocation('/catatan')}
                className="flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={15} /> Kembali ke Aplikasi
              </button>
              <button
                onClick={handleLogout}
                className="flex min-h-10 items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut size={15} /> Keluar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success / navigating overlay */}
      <AnimatePresence>
        {isNavigating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="absolute inset-0 flex flex-col items-center justify-center p-6"
          >
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevated">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 15, delay: 0.1 }}
              >
                <Check size={34} strokeWidth={3} />
              </motion.div>
            </div>
            <h2 className="text-2xl font-bold text-foreground">Berhasil!</h2>
            <p className="mt-1.5 max-w-[240px] text-center text-sm text-muted-foreground">
              Google Drive terhubung. Spreadsheet pribadi kamu sudah siap.
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={15} className="animate-spin" />
              Mengalihkan ke aplikasi...
            </div>
            <button
              onClick={handleManualContinue}
              className="mt-4 text-sm font-semibold text-primary hover:underline"
            >
              Lanjut sekarang
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
