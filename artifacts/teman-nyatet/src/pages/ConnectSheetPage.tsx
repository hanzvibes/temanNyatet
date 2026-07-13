import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiGet, apiPost } from '@/lib/apiClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { NotebookPen, LogOut, Copy, Check, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadStatus = async () => {
    try {
      const data = await apiGet<SpreadsheetStatus>('/spreadsheet/status');
      setStatus(data);
      setShowForm(!data.connected);
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
    if (!input.trim()) {
      toast.error('Tempel link atau ID spreadsheet dulu');
      return;
    }
    setConnecting(true);
    try {
      const data = await apiPost<SpreadsheetStatus>('/spreadsheet/connect', { input: input.trim() });
      setStatus(data);
      setShowForm(false);
      setInput('');
      toast.success('Spreadsheet berhasil terhubung!');
      await refreshProfile();
    } catch (err) {
      toast.error((err as Error).message || 'Gagal menghubungkan spreadsheet');
    } finally {
      setConnecting(false);
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
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background overflow-y-auto">
      <div className="w-full max-w-sm flex flex-col items-center text-center mb-8">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mb-3 shadow-sm text-primary-foreground">
          <NotebookPen size={24} />
        </div>
        <h1 className="text-xl font-bold text-foreground">TemanNyatet</h1>
      </div>

      <div className="w-full max-w-sm bg-card rounded-2xl shadow-md p-6 border border-border">
        {status?.connected && !showForm ? (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">Spreadsheet Terhubung</h2>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Semua catatan, transaksi, todo, dan link kamu tersimpan di spreadsheet pribadi ini.
            </p>
            <a
              href={status.spreadsheetUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-full shadow-sm hover:opacity-90 transition-opacity mb-3"
            >
              Buka Spreadsheet <ExternalLink size={16} />
            </a>
            <button
              onClick={() => setShowForm(true)}
              className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Ganti spreadsheet
            </button>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-foreground mb-2">Hubungkan Spreadsheet Kamu</h2>
            <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
              Data kamu disimpan di Google Spreadsheet pribadi milikmu sendiri, bukan di server kami.
            </p>

            <ol className="space-y-4 mb-6 text-sm text-foreground">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">1</span>
                <span className="pt-0.5">Buat spreadsheet baru di Google Sheets kamu.</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">2</span>
                <div className="flex-1">
                  <p className="mb-2 pt-0.5">Klik Share, tambahkan email ini sebagai Editor:</p>
                  <button
                    onClick={handleCopyEmail}
                    disabled={!status?.serviceAccountEmail}
                    className="w-full flex items-center justify-between gap-2 bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-mono text-foreground hover:bg-secondary/70 transition-colors disabled:opacity-50"
                  >
                    <span className="truncate text-left">{status?.serviceAccountEmail ?? 'Belum dikonfigurasi'}</span>
                    {copied ? (
                      <Check size={14} className="text-primary flex-shrink-0" />
                    ) : (
                      <Copy size={14} className="text-muted-foreground flex-shrink-0" />
                    )}
                  </button>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">3</span>
                <span className="pt-0.5">Salin link spreadsheet-nya, lalu tempel di bawah ini.</span>
              </li>
            </ol>

            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="w-full bg-secondary border border-border rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-medium text-foreground text-sm py-3 px-4 mb-4"
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
            />

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="w-full bg-primary text-primary-foreground font-semibold py-3 px-4 rounded-full shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {connecting ? 'Menghubungkan...' : 'Hubungkan Spreadsheet'}
            </button>

            {status?.connected && (
              <button
                onClick={() => setShowForm(false)}
                className="w-full mt-3 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                Batal
              </button>
            )}
          </>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
      >
        <LogOut size={16} /> Keluar
      </button>
    </div>
  );
}
