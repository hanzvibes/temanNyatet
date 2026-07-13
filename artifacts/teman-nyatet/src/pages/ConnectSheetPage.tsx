import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiGet, apiPost } from '@/lib/apiClient';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  NotebookPen,
  LogOut,
  Copy,
  Check,
  ExternalLink,
  Loader2,
  FileSpreadsheet,
  ShieldCheck,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface SpreadsheetStatus {
  connected: boolean;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  serviceAccountEmail: string | null;
  sheetsConfigured: boolean;
}

export default function ConnectSheetPage() {
  const { refreshProfile } = useAuthContext();
  const [status, setStatus] = useState<SpreadsheetStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [input, setInput] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [showReconnect, setShowReconnect] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    try {
      const data = await apiGet<SpreadsheetStatus>('/spreadsheet/status');
      setStatus(data);
      setShowReconnect(!data.connected);
    } catch (err) {
      console.warn('[ConnectSheetPage] Failed to load status:', err);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleCopyEmail = async () => {
    if (!status?.serviceAccountEmail) return;
    try {
      await navigator.clipboard.writeText(status.serviceAccountEmail);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
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
      await refreshProfile();
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

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-card/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-border p-6 sm:p-8"
      >
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg text-primary-foreground">
            {connected ? <FileSpreadsheet size={28} /> : <NotebookPen size={28} />}
          </div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {connected ? 'Spreadsheet Terhubung' : 'Hubungkan Spreadsheet'}
          </h1>
          <p className="text-muted-foreground text-sm mt-2 max-w-xs">
            {connected
              ? 'Data kamu tersimpan aman di spreadsheet pribadi milikmu sendiri.'
              : 'Data catatan, keuangan, todo, dan link kamu disimpan di Google Spreadsheet pribadi.'}
          </p>
        </div>

        {connected ? (
          <div className="space-y-4">
            <a
              href={status.spreadsheetUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-2xl shadow-sm hover:opacity-90 transition-opacity"
            >
              Buka Spreadsheet <ExternalLink size={18} />
            </a>

            <button
              onClick={() => setShowReconnect(true)}
              className="w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
            >
              Ganti spreadsheet
            </button>
          </div>
        ) : (
          <>
            {/* Steps */}
            <div className="space-y-3 mb-5">
              <Step number={1} icon={FileSpreadsheet}>
                Buat spreadsheet baru di Google Drive kamu.
              </Step>
              <Step number={2} icon={ShieldCheck}>
                <span className="block mb-2">Share dengan email service account ini:</span>
                <button
                  onClick={handleCopyEmail}
                  disabled={!status?.serviceAccountEmail}
                  className="w-full flex items-center justify-between gap-2 bg-secondary border border-border rounded-xl px-3 py-2.5 text-xs font-mono text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50"
                >
                  <span className="truncate text-left">{status?.serviceAccountEmail ?? 'Belum dikonfigurasi'}</span>
                  {copied ? (
                    <Check size={14} className="text-primary flex-shrink-0" />
                  ) : (
                    <Copy size={14} className="text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              </Step>
              <Step number={3} icon={ExternalLink}>
                Salin link spreadsheet-nya, lalu tempel di bawah ini.
              </Step>
            </div>

            {/* Input */}
            <div className="mb-4">
              <input
                type="text"
                value={input}
                onChange={e => { setInput(e.target.value); setError(null); }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full bg-secondary border border-border rounded-2xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium text-foreground text-sm py-3.5 px-4 transition-all"
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
    </div>
  );
}

function Step({ number, icon: Icon, children }: { number: number; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 text-sm text-foreground">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary border border-border flex items-center justify-center text-xs font-bold">
        {number}
      </div>
      <div className="flex-1 pt-0.5 leading-relaxed">{children}</div>
    </div>
  );
}
