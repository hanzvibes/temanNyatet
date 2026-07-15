import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiGet, apiPost } from '@/lib/apiClient';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  LogOut,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  FileSpreadsheet,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

// The master template spreadsheet that users copy to their own Drive.
// Set VITE_SPREADSHEET_TEMPLATE_ID in the environment to enable the
// one-click "Copy Template" button. If unset, a generic link is shown.
const TEMPLATE_ID = import.meta.env.VITE_SPREADSHEET_TEMPLATE_ID as string | undefined;
const TEMPLATE_COPY_URL = TEMPLATE_ID
  ? `https://docs.google.com/spreadsheets/d/${TEMPLATE_ID}/copy`
  : 'https://docs.google.com/spreadsheets/';

interface SpreadsheetStatus {
  connected: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  serviceAccountEmail: string | null;
  sheetsConfigured: boolean;
  templateVersion: string | null;
}

// Error codes surfaced via ?error= query param (set by the global error
// handler in App.tsx when a spreadsheet access error fires mid-session).
const ERROR_MESSAGES: Record<string, { title: string; body: string }> = {
  SPREADSHEET_NOT_FOUND: {
    title: 'Spreadsheet tidak ditemukan',
    body: 'Spreadsheet yang terhubung tidak dapat ditemukan — mungkin sudah dihapus atau dipindahkan. Hubungkan spreadsheet baru untuk melanjutkan.',
  },
  SPREADSHEET_ACCESS_DENIED: {
    title: 'Akses spreadsheet dicabut',
    body: 'TemanNyatet tidak lagi punya akses ke spreadsheet kamu. Share ulang ke email service account sebagai Editor.',
  },
};

export default function ConnectSheetPage() {
  const { refreshProfile } = useAuthContext();
  const [status, setStatus] = useState<SpreadsheetStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [input, setInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [templateOpened, setTemplateOpened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  // Error code from query param (set when redirected after a mid-session
  // spreadsheet error — see App.tsx's AuthGuard).
  const recoveryError = new URLSearchParams(window.location.search).get('error');
  const recoveryInfo = recoveryError ? ERROR_MESSAGES[recoveryError] ?? null : null;

  const loadStatus = async () => {
    try {
      const data = await apiGet<SpreadsheetStatus>('/spreadsheet/status');
      setStatus(data);
      setShowReconnect(!data.connected || !!recoveryError);
    } catch (err) {
      console.warn('[ConnectSheetPage] Failed to load status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshProfileRef = useRef(refreshProfile);
  refreshProfileRef.current = refreshProfile;

  useEffect(() => {
    if (!isNavigating) return;
    const timer = setTimeout(() => {
      refreshProfileRef.current();
    }, 1500);
    return () => clearTimeout(timer);
  }, [isNavigating]);

  const handleCopyEmail = async () => {
    if (!status?.serviceAccountEmail) return;
    try {
      await navigator.clipboard.writeText(status.serviceAccountEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
      toast.success('Email disalin!');
    } catch {
      toast.error('Gagal menyalin email');
    }
  };

  const handleConnect = async () => {
    setError(null);
    if (!input.trim()) {
      setError('Tempel link atau ID spreadsheet dulu.');
      return;
    }
    setConnecting(true);
    try {
      const data = await apiPost<SpreadsheetStatus>('/spreadsheet/connect', { input: input.trim() });
      setStatus(data);
      setShowReconnect(false);
      setInput('');
      toast.success('Spreadsheet berhasil terhubung!');
      setIsNavigating(true);
    } catch (err) {
      const message = (err as Error).message || 'Gagal menghubungkan spreadsheet';
      setError(message);
    } finally {
      setConnecting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loadingStatus) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const connected = status?.connected && !showReconnect;

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6 bg-gradient-to-br from-background to-secondary/30 relative overflow-hidden">
      {/* Decorative backdrop blobs */}
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
            {/* Recovery alert — shown when redirected after a mid-session error */}
            {recoveryInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-5 flex gap-3 bg-destructive/10 border border-destructive/20 rounded-2xl p-4"
              >
                <AlertTriangle size={18} className="flex-shrink-0 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-destructive">{recoveryInfo.title}</p>
                  <p className="text-xs text-destructive/80 mt-0.5 leading-relaxed">{recoveryInfo.body}</p>
                </div>
              </motion.div>
            )}

            {/* Header */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg text-primary-foreground">
                <FileSpreadsheet size={28} />
              </div>
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                {connected ? 'Spreadsheet Terhubung' : 'Hubungkan Spreadsheet'}
              </h1>
              <p className="text-muted-foreground text-sm mt-2 max-w-xs">
                {connected
                  ? 'Data kamu tersimpan aman di spreadsheet pribadi milikmu sendiri.'
                  : 'Data catatan, keuangan, todo, dan link kamu disimpan di Google Spreadsheet pribadimu.'}
              </p>
            </div>

            {connected ? (
              // ── Connected state ────────────────────────────────────────────
              <div className="space-y-4">
                <a
                  href={status.spreadsheetUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-2xl shadow-sm hover:opacity-90 transition-opacity"
                >
                  Buka Spreadsheet <ExternalLink size={18} />
                </a>

                {status.templateVersion && (
                  <p className="text-center text-xs text-muted-foreground">
                    Template v{status.templateVersion}
                  </p>
                )}

                <button
                  onClick={() => setShowReconnect(true)}
                  className="w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2 flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={14} /> Ganti spreadsheet
                </button>
              </div>
            ) : (
              // ── Onboarding / reconnect flow ────────────────────────────────
              <>
                <div className="space-y-4 mb-5">
                  {/* Step 1 — Copy template */}
                  <OnboardingStep
                    number={1}
                    icon={FileSpreadsheet}
                    done={templateOpened}
                    title="Salin Template"
                  >
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      Buka template resmi TemanNyatet, lalu pilih{' '}
                      <span className="font-medium text-foreground">File → Buat salinan</span>.
                    </p>
                    <a
                      href={TEMPLATE_COPY_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setTemplateOpened(true)}
                      className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity shadow-sm"
                    >
                      {TEMPLATE_ID ? 'Salin Template →' : 'Buka Google Sheets →'}
                      <ExternalLink size={14} />
                    </a>
                  </OnboardingStep>

                  {/* Step 2 — Share to service account */}
                  <OnboardingStep
                    number={2}
                    icon={ShieldCheck}
                    done={copiedEmail}
                    title="Share ke TemanNyatet"
                  >
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      Di spreadsheet salinанmu, klik <span className="font-medium text-foreground">Share</span> dan
                      tambahkan email ini sebagai <span className="font-medium text-foreground">Editor</span>:
                    </p>
                    <button
                      onClick={handleCopyEmail}
                      disabled={!status?.serviceAccountEmail}
                      className="w-full flex items-start justify-between gap-2 bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs font-mono text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50 text-left"
                    >
                      <span className="break-all leading-relaxed">
                        {status?.serviceAccountEmail ?? 'Belum dikonfigurasi'}
                      </span>
                      <span className="flex-shrink-0 mt-0.5">
                        {copiedEmail ? (
                          <Check size={14} className="text-primary" />
                        ) : (
                          <Copy size={14} className="text-muted-foreground" />
                        )}
                      </span>
                    </button>
                  </OnboardingStep>

                  {/* Step 3 — Paste URL */}
                  <OnboardingStep
                    number={3}
                    icon={ExternalLink}
                    done={false}
                    title="Tempel Link Spreadsheet"
                  >
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      Salin link spreadsheet salinанmu dari address bar, lalu tempel di sini.
                    </p>
                    <input
                      type="text"
                      value={input}
                      onChange={e => { setInput(e.target.value); setError(null); }}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full bg-secondary border border-border rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground text-sm py-3 px-3.5 transition-all"
                      onKeyDown={e => e.key === 'Enter' && handleConnect()}
                    />
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-start gap-2 mt-2 text-destructive text-xs"
                        >
                          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                          <span>{error}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </OnboardingStep>
                </div>

                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="w-full bg-primary text-primary-foreground font-semibold py-3.5 px-4 rounded-2xl shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {connecting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" /> Menghubungkan...
                    </>
                  ) : (
                    <>
                      Hubungkan Spreadsheet <ChevronRight size={18} />
                    </>
                  )}
                </button>

                {status?.connected && (
                  <button
                    onClick={() => setShowReconnect(false)}
                    className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                  >
                    Batal
                  </button>
                )}
              </>
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

      {/* Success overlay shown while transitioning to the app */}
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
              Spreadsheet kamu sudah terhubung.
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              Mengalihkan ke aplikasi...
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Onboarding step component ───────────────────────────────────────────────

function OnboardingStep({
  number,
  icon: Icon,
  done,
  title,
  children,
}: {
  number: number;
  icon: React.ElementType;
  done: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/30 p-4">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
            done
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary border border-border text-foreground'
          }`}
        >
          {done ? <Check size={13} strokeWidth={3} /> : number}
        </div>
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-primary" />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
      </div>
      <div className="pl-10">{children}</div>
    </div>
  );
}
