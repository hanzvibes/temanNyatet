import React, { useEffect, useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';
import { apiGet, apiUpload } from '@/lib/apiClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { ChevronRight, ArrowLeft, LogOut, User, Lock, Phone, Camera, Loader2, Sheet, MessageSquare, Crown, Calendar, Sparkles, Sun, Moon, Monitor } from 'lucide-react';
import { toast } from 'sonner';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { openPaymentCheckout, type PaymentPlan } from '@/lib/payment';
import TopUpSection from '@/components/TopUpSection';
import AiSummaryDetails from '@/components/AiSummaryDetails';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type ActiveSection = null | 'name' | 'password' | 'phone' | 'feedback' | 'subscription' | 'topup';

interface SubscriptionStatus {
  subscription_status: 'pending' | 'active' | 'archived';
  subscription_plan: 'monthly' | 'yearly' | null;
  subscription_end: string | null;
  days_remaining: number | null;
  credit_balance: number;
}

interface SettingsSheetProps {
  avatarBg: string;
  avatarTextColor: string;
  viewport?: 'mobile' | 'desktop';
}

const DESKTOP_BREAKPOINT = 1024;

function useViewportActive(viewport: SettingsSheetProps['viewport']) {
  const [isActive, setIsActive] = useState(() => {
    if (!viewport || typeof window === 'undefined') return true;
    return viewport === 'desktop'
      ? window.innerWidth >= DESKTOP_BREAKPOINT
      : window.innerWidth < DESKTOP_BREAKPOINT;
  });

  useEffect(() => {
    if (!viewport) return;

    const mediaQuery = window.matchMedia(`(min-width: ${DESKTOP_BREAKPOINT}px)`);
    const update = () => {
      setIsActive(viewport === 'desktop' ? mediaQuery.matches : !mediaQuery.matches);
    };

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, [viewport]);

  return isActive;
}

export default function SettingsSheet({ avatarBg, avatarTextColor, viewport }: SettingsSheetProps) {
  const { user, profile, refreshProfile } = useAuthContext();
  const [, setLocation] = useLocation();
  const isViewportActive = useViewportActive(viewport);
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [subStatus, setSubStatus] = useState<SubscriptionStatus | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const drawerContentRef = useRef<HTMLDivElement>(null);
  const settingsScrollRef = useRef<HTMLDivElement>(null);
  const initialMenuHeightRef = useRef<number | null>(null);
  const [menuMinHeight, setMenuMinHeight] = useState<number | null>(null);

  // Form state
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.substring(0, 2).toUpperCase() || 'TN';

  const isPro = profile?.subscription_status === 'active';

  const handleSubscriptionCheckout = async (plan: PaymentPlan) => {
    setCheckoutLoading(true);
    try {
      await openPaymentCheckout(plan);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal menyiapkan pembayaran. Coba lagi.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Fetch the authoritative subscription status from the API when the user
  // opens the subscription section. We don't rely solely on the cached profile
  // because payment webhooks / admin actions can change server-side fields the
  // profile may not yet have picked up.
  const loadSubscription = async () => {
    setSubLoading(true);
    setSubError(null);
    try {
      const [data, credits] = await Promise.all([
        apiGet<SubscriptionStatus>('/subscription/status'),
        apiGet<{ balance: number }>('/credits'),
      ]);
      setSubStatus({ ...data, credit_balance: credits.balance });
    } catch (err) {
      // Check for offline / network failure first
      if (!navigator.onLine || (err instanceof TypeError && String(err).includes('fetch'))) {
        setSubError('offline');
      } else {
        // Fall back to the locally-cached profile fields so the user still
        // sees *something* even if the request fails (e.g. api-server cold start).
        if (profile?.subscription_status) {
          setSubStatus({
            subscription_status: profile.subscription_status as SubscriptionStatus['subscription_status'],
            subscription_plan: (profile?.subscription_plan as SubscriptionStatus['subscription_plan']) ?? null,
            subscription_end: (profile?.subscription_end as string | null) ?? null,
            days_remaining: null,
             credit_balance: 0,
          });
          // Show a soft warning — data may be stale
          setSubError('stale');
        } else {
          setSubError('unavailable');
        }
      }
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'subscription') loadSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  useEffect(() => {
    const openSubscription = (event: Event) => {
      if (!isViewportActive) return;
      // Multiple SettingsSheet instances can be mounted at once (sidebar +
      // page header on desktop). Claim the shared request so only the first
      // instance opens and duplicate subscription drawers cannot stack.
      if (event.defaultPrevented) return;
      event.preventDefault();
      setOpen(true);
      setActiveSection('subscription');
    };
    window.addEventListener('teman-nyatet:open-settings-subscription', openSubscription);
    const openTopUp = (event: Event) => {
      if (!isViewportActive || event.defaultPrevented) return;
      event.preventDefault();
      setOpen(false);
      window.setTimeout(() => {
        setOpen(true);
        setActiveSection('topup');
      }, 180);
    };
    window.addEventListener('teman-nyatet:open-settings-topup', openTopUp);
    return () => {
      window.removeEventListener('teman-nyatet:open-settings-subscription', openSubscription);
      window.removeEventListener('teman-nyatet:open-settings-topup', openTopUp);
    };
  }, [isViewportActive]);

  // Broadcast open/closed state on the shared overlay channel so the PWA
  // install prompt (and any future peripheral chrome) can step aside while
  // this drawer is on screen. `vaul` controls `open` via internal gestures
  // and our `onOpenChange` handler — the effect fires on every transition,
  // not just the explicit `handleOpen`/`handleLogout` paths.
  useEffect(() => {
    if (!isViewportActive) return;
    window.dispatchEvent(
      new CustomEvent('teman-nyatet:any-overlay', { detail: { open } }),
    );
  }, [isViewportActive, open]);

  // If the viewport crosses the desktop breakpoint while this drawer is
  // open, this instance becomes inactive and returns null below. Close its
  // state explicitly so it cannot leave a stale overlay/focus lock behind or
  // reopen unexpectedly when the viewport crosses back.
  useEffect(() => {
    if (isViewportActive || (!open && activeSection === null)) return;

    setOpen(false);
    setActiveSection(null);
    window.dispatchEvent(
      new CustomEvent('teman-nyatet:any-overlay', { detail: { open: false } }),
    );
  }, [activeSection, isViewportActive, open]);

  // Vaul sizes the drawer from its current content. Detail forms are shorter
  // than the settings menu, so returning with the back button can leave the
  // drawer at the detail height. Capture the first menu height and restore it
  // whenever the menu is shown again.
  useEffect(() => {
    if (!open || activeSection !== null || initialMenuHeightRef.current !== null) return;

    const frame = window.requestAnimationFrame(() => {
      const drawer = drawerContentRef.current;
      if (!drawer) return;

      const viewportCap = Math.min(window.innerHeight * 0.88, 48 * 16);
      const measuredHeight = Math.ceil(drawer.getBoundingClientRect().height);
      const stableHeight = Math.min(measuredHeight, viewportCap);

      if (stableHeight > 0) {
        initialMenuHeightRef.current = stableHeight;
        setMenuMinHeight(stableHeight);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [open, activeSection]);

  // A return to the menu should also start at the top, not at a previous
  // scroll position from the settings list.
  useEffect(() => {
    if (activeSection === null) {
      settingsScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [activeSection]);

  const handleOpen = () => {
    setActiveSection(null);
    setOpen(true);
  };

  const handleBack = () => {
    setActiveSection(null);
    setNameInput('');
    setPhoneInput('');
    setNewPassword('');
    setConfirmPassword('');
    setFeedbackInput('');
  };

  const handleOpenSection = (section: ActiveSection) => {
    if (section === 'name') setNameInput(profile?.name || '');
    if (section === 'phone') setPhoneInput(profile?.phone || '');
    if (section === 'feedback') setFeedbackInput('');
    setNewPassword('');
    setConfirmPassword('');
    setActiveSection(section);
  };

  const handleSaveName = async () => {
    if (!user) return;
    const trimmed = nameInput.trim();
    if (!trimmed) { toast.error('Nama tidak boleh kosong'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ name: trimmed }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Nama berhasil diperbarui!');
      handleBack();
    } catch {
      toast.error('Gagal memperbarui nama');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhone = async () => {
    if (!user) return;
    const trimmed = phoneInput.trim();
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ phone: trimmed || null }).eq('id', user.id);
      if (error) throw error;
      await refreshProfile();
      toast.success('Nomor HP berhasil diperbarui!');
      handleBack();
    } catch {
      toast.error('Gagal memperbarui nomor HP');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (newPassword.length < 6) { toast.error('Password minimal 6 karakter'); return; }
    if (newPassword !== confirmPassword) { toast.error('Konfirmasi password tidak cocok'); return; }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Password berhasil diperbarui!');
      handleBack();
    } catch {
      toast.error('Gagal memperbarui password');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOpen(false);
  };

  const handleSendFeedback = () => {
    const trimmed = feedbackInput.trim();
    if (!trimmed) {
      toast.error('Feedback tidak boleh kosong');
      return;
    }

    const subject = encodeURIComponent('[TemanNyatet] Laporan Bug');
    const body = encodeURIComponent(
      `Dari: ${user?.email || 'pengguna'}\n\n${trimmed}\n\n---\nUser agent: ${navigator.userAgent}`,
    );

    window.location.href = `mailto:rhn.rmdhniii@gmail.com?subject=${subject}&body=${body}`;
    toast.success('Aplikasi email dibuka. Silakan kirim laporanmu.');
    handleBack();
  };

  const handlePickAvatar = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast.error('Format foto harus JPG, PNG, atau WebP');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Ukuran foto maksimal 5MB');
      return;
    }

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await apiUpload('/profile/avatar', formData);
      await refreshProfile();
      toast.success('Foto profil berhasil diperbarui!');
    } catch {
      toast.error('Gagal mengunggah foto profil');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const INP = 'w-full bg-secondary border border-border rounded-xl outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 font-bold text-foreground transition-all py-3 px-4 text-sm';

  if (!isViewportActive) return null;

  return (
    <>
      {/* Avatar trigger */}
      <button
        onClick={handleOpen}
        className={`rounded-full border-2 border-card flex items-center justify-center font-bold shadow-sm transition-transform active:scale-95 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card w-[clamp(2.5rem,8vw,3.5rem)] h-[clamp(2.5rem,8vw,3.5rem)] text-[clamp(0.75rem,3vw,1rem)] ${avatarBg} ${avatarTextColor}`}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="Foto profil" className="w-full h-full object-cover" />
        ) : (
          initials
        )}
      </button>

      <input
        ref={avatarInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm will-change-[opacity]" />
          <Drawer.Content
            ref={drawerContentRef}
            style={activeSection === null && menuMinHeight !== null ? { minHeight: menuMinHeight } : undefined}
            className="bg-card flex flex-col rounded-t-[clamp(1.25rem,4vw,2rem)] fixed bottom-0 left-0 right-0 z-50 outline-none mx-auto w-full sm:max-w-[540px] md:max-w-[600px] lg:max-w-[640px] xl:max-w-[720px] max-h-[min(88vh,48rem)] will-change-transform"
          >
            <div className="mx-auto mt-[clamp(0.5rem,1.5vw,0.75rem)] mb-0 h-[clamp(0.25rem,0.8vw,0.375rem)] w-[clamp(2.5rem,8vw,3rem)] flex-shrink-0 rounded-full bg-muted-foreground/20" />

            {/* Header row */}
            <div className="flex min-h-[clamp(2.5rem,7vw,3rem)] items-center justify-between px-[clamp(1rem,4vw,1.75rem)] py-[clamp(0.375rem,1.5vw,0.625rem)]">
              {activeSection ? (
                <button onClick={handleBack} className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] text-[clamp(0.8125rem,2.5vw,1rem)] font-bold text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card rounded-lg px-2 py-1">
                  <ArrowLeft size={16} strokeWidth={2.5} />
                  Kembali
                </button>
              ) : (
                <h2 className="text-[clamp(1rem,3.5vw,1.5rem)] font-extrabold text-foreground">Pengaturan</h2>
              )}
              {activeSection === 'topup' && (
                <span className="text-[clamp(0.8125rem,2.5vw,1rem)] font-extrabold text-foreground">
                  Top Up AI Credit
                </span>
              )}
            </div>

            <div
              ref={settingsScrollRef}
              className="flex-1 overflow-y-auto px-[clamp(1rem,4vw,1.75rem)] pb-[clamp(1rem,3vw,1.5rem)]"
            >

              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeSection ?? 'menu'}
                  initial={{ x: activeSection ? 24 : -24, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: activeSection ? 24 : -24, opacity: 0 }}
                  transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
                >
                  {activeSection === null ? (
                    <>
                      {/* ── Profile header ── */}
                      <div className="flex flex-col items-center pt-0 pb-[clamp(0.625rem,2vw,1rem)]">
                        {/* Big avatar */}
                        <div className="relative mb-[clamp(0.5rem,2vw,0.75rem)]">
                          <div className="flex h-[clamp(4rem,12vw,5rem)] w-[clamp(4rem,12vw,5rem)] items-center justify-center overflow-hidden rounded-full bg-primary text-[clamp(1.25rem,4.5vw,1.75rem)] font-extrabold text-primary-foreground shadow-md">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="Foto profil" className="w-full h-full object-cover" />
                            ) : (
                              initials
                            )}
                            {uploadingAvatar && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Loader2 className="animate-spin text-white" size={20} />
                              </div>
                            )}
                          </div>
                          <button
                            onClick={handlePickAvatar}
                            disabled={uploadingAvatar}
                            aria-label="Ganti foto profil"
                            className="absolute bottom-0 right-0 rounded-full bg-secondary border-2 border-card flex items-center justify-center shadow-sm transition-transform active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card w-[clamp(1.5rem,5vw,1.875rem)] h-[clamp(1.5rem,5vw,1.875rem)]"
                          >
                            <Camera size={13} className="text-foreground w-[clamp(0.75rem,2.5vw,0.875rem)] h-[clamp(0.75rem,2.5vw,0.875rem)]" strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Subscription badge */}
                        <span className={`mb-[clamp(0.375rem,1.5vw,0.625rem)] rounded-full px-[clamp(0.625rem,2vw,0.875rem)] py-[clamp(0.1875rem,0.75vw,0.3125rem)] text-[clamp(0.625rem,2vw,0.75rem)] font-extrabold uppercase tracking-widest ${
                          isPro
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {isPro ? 'PRO' : 'FREE'}
                        </span>

                        {/* Name */}
                        <p className="text-center text-[clamp(1rem,3.5vw,1.5rem)] font-extrabold leading-tight text-foreground">
                          {profile?.name || <span className="text-muted-foreground font-bold italic text-[clamp(0.875rem,3vw,1.125rem)]">Nama belum diatur</span>}
                        </p>

                        {/* Email */}
                        <p className="mt-0.5 text-center text-[clamp(0.75rem,2.5vw,1rem)] font-medium text-muted-foreground">
                          {user?.email}
                        </p>

                        {/* Phone */}
                        {profile?.phone && (
                          <p className="mt-0.5 text-center text-[clamp(0.75rem,2.5vw,1rem)] font-medium text-muted-foreground">
                            {profile.phone}
                          </p>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="mb-[clamp(0.375rem,1.5vw,0.625rem)] h-px bg-border" />

                      {/* Menu items */}
                      <div className="space-y-0.5">
                        {[
                          { key: 'name' as const,     icon: User,  label: 'Ganti Nama' },
                          { key: 'password' as const, icon: Lock,  label: 'Ganti Password' },
                          { key: 'phone' as const,    icon: Phone, label: 'Ganti Nomor HP' },
                          { key: 'subscription' as const, icon: Crown, label: 'Informasi Langganan' },
                          { key: 'feedback' as const, icon: MessageSquare, label: 'Kirim Feedback' },
                        ].map(({ key, icon: Icon, label }) => (
                          <button
                            key={key}
                            onClick={() => handleOpenSection(key)}
                            className="flex min-h-14 w-full items-center gap-[clamp(0.625rem,2.5vw,0.875rem)] rounded-[clamp(0.625rem,2.5vw,1rem)] px-[clamp(0.625rem,2.5vw,1rem)] py-2 hover:bg-secondary active:bg-secondary/80 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                          >
                            <div className="flex h-[clamp(2.25rem,7vw,2.5rem)] w-[clamp(2.25rem,7vw,2.5rem)] flex-shrink-0 items-center justify-center rounded-xl border border-border bg-secondary">
                              <Icon size={18} className="text-muted-foreground w-[clamp(1rem,3.5vw,1.125rem)] h-[clamp(1rem,3.5vw,1.125rem)]" strokeWidth={2.2} />
                            </div>
                            <span className="flex-1 font-bold text-foreground text-[clamp(0.875rem,3vw,1.125rem)]">{label}</span>
                            <ChevronRight size={16} className="text-muted-foreground/50 w-[clamp(1rem,3vw,1.25rem)] h-[clamp(1rem,3vw,1.25rem)]" strokeWidth={2.5} />
                          </button>
                        ))}
                        <button
                          onClick={() => { setOpen(false); setLocation('/connect-sheet'); }}
                           className="flex min-h-14 w-full items-center gap-[clamp(0.625rem,2.5vw,0.875rem)] rounded-[clamp(0.625rem,2.5vw,1rem)] px-[clamp(0.625rem,2.5vw,1rem)] py-2 hover:bg-secondary active:bg-secondary/80 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                        >
                          <div className="flex h-[clamp(2.25rem,7vw,2.5rem)] w-[clamp(2.25rem,7vw,2.5rem)] flex-shrink-0 items-center justify-center rounded-xl border border-border bg-secondary">
                            <Sheet size={18} className="text-muted-foreground w-[clamp(1rem,3.5vw,1.125rem)] h-[clamp(1rem,3.5vw,1.125rem)]" strokeWidth={2.2} />
                          </div>
                          <span className="flex-1 font-bold text-foreground text-[clamp(0.875rem,3vw,1.125rem)]">Spreadsheet Saya</span>
                          <ChevronRight size={16} className="text-muted-foreground/50 w-[clamp(1rem,3vw,1.25rem)] h-[clamp(1rem,3vw,1.25rem)]" strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* Tema — three-button segmented control reading/writing the
                          theme preference saved by main.tsx boot. Lives below the
                          menu and above the destructive divider so accidental
                          taps force-clear plugins can't reach it. */}
                      <div className="space-y-2 pt-3">
                        <h3 className="text-[clamp(0.625rem,2vw,0.75rem)] font-bold text-muted-foreground uppercase tracking-widest px-[clamp(0.75rem,3vw,1.25rem)]">
                          Tampilan
                        </h3>
                        <div className="px-[clamp(0.25rem,1vw,0.5rem)]">
                          <ThemeToggle />
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="my-2 h-px bg-border" />

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="flex min-h-14 w-full items-center gap-[clamp(0.625rem,2.5vw,0.875rem)] rounded-[clamp(0.625rem,2.5vw,1rem)] px-[clamp(0.625rem,2.5vw,1rem)] py-2 hover:bg-destructive/10 active:bg-destructive/15 transition-colors text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                      >
                          <div className="flex h-[clamp(2.25rem,7vw,2.5rem)] w-[clamp(2.25rem,7vw,2.5rem)] flex-shrink-0 items-center justify-center rounded-xl border border-destructive/20 bg-destructive/10">
                          <LogOut size={18} className="text-destructive w-[clamp(1rem,3.5vw,1.125rem)] h-[clamp(1rem,3.5vw,1.125rem)]" strokeWidth={2.2} />
                        </div>
                        <span className="flex-1 font-bold text-destructive text-[clamp(0.875rem,3vw,1.125rem)]">Keluar</span>
                      </button>
                    </>
                  ) : activeSection === 'name' ? (
                    <div className="pt-[clamp(0.25rem,1vw,0.5rem)] space-y-[clamp(1rem,3vw,1.5rem)]">
                      <div>
                        <label className="text-[clamp(0.625rem,2vw,0.75rem)] font-bold text-muted-foreground uppercase tracking-widest mb-[clamp(0.25rem,1vw,0.5rem)] block">Nama Baru</label>
                        <input
                          type="text"
                          value={nameInput}
                          onChange={e => setNameInput(e.target.value)}
                          placeholder="Masukkan nama kamu"
                          className={INP}
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                        />
                      </div>
                      <Button
                        onClick={handleSaveName}
                        disabled={saving}
                        className="w-full"
                        size="lg"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan Nama'}
                      </Button>
                    </div>
                  ) : activeSection === 'password' ? (
                    <div className="pt-[clamp(0.25rem,1vw,0.5rem)] space-y-[clamp(1rem,3vw,1.5rem)]">
                      <div>
                        <label className="text-[clamp(0.625rem,2vw,0.75rem)] font-bold text-muted-foreground uppercase tracking-widest mb-[clamp(0.25rem,1vw,0.5rem)] block">Password Baru</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className={INP}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-[clamp(0.625rem,2vw,0.75rem)] font-bold text-muted-foreground uppercase tracking-widest mb-[clamp(0.25rem,1vw,0.5rem)] block">Konfirmasi Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password baru"
                          className={INP}
                          onKeyDown={e => e.key === 'Enter' && handleSavePassword()}
                        />
                      </div>
                      <Button
                        onClick={handleSavePassword}
                        disabled={saving}
                        className="w-full"
                        size="lg"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan Password'}
                      </Button>
                    </div>
                  ) : activeSection === 'phone' ? (
                    <div className="pt-[clamp(0.25rem,1vw,0.5rem)] space-y-[clamp(1rem,3vw,1.5rem)]">
                      <div>
                        <label className="text-[clamp(0.625rem,2vw,0.75rem)] font-bold text-muted-foreground uppercase tracking-widest mb-[clamp(0.25rem,1vw,0.5rem)] block">Nomor HP</label>
                        <input
                          type="tel"
                          value={phoneInput}
                          onChange={e => setPhoneInput(e.target.value)}
                          placeholder="Contoh: 08123456789"
                          className={INP}
                          autoFocus
                          onKeyDown={e => e.key === 'Enter' && handleSavePhone()}
                        />
                      </div>
                      <Button
                        onClick={handleSavePhone}
                        disabled={saving}
                        className="w-full"
                        size="lg"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan Nomor HP'}
                      </Button>
                    </div>
                  ) : activeSection === 'subscription' ? (
                    <div className="pt-[clamp(0.25rem,1vw,0.5rem)] space-y-[clamp(1rem,3vw,1.5rem)]">
                      {subLoading ? (
                        /* ── Loading skeleton ── */
                        <div className="space-y-[clamp(0.75rem,3vw,1rem)]">
                          <div className="rounded-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,4vw,1.5rem)] border border-border bg-secondary animate-pulse">
                            <div className="flex items-center gap-[clamp(0.75rem,3vw,1rem)]">
                              <div className="rounded-xl bg-muted flex-shrink-0 w-[clamp(2.75rem,10vw,3.5rem)] h-[clamp(2.75rem,10vw,3.5rem)]" />
                              <div className="flex-1 space-y-2">
                                <div className="h-3 bg-muted rounded-full w-1/3" />
                                <div className="h-5 bg-muted rounded-full w-2/3" />
                              </div>
                            </div>
                          </div>
                          <div className="h-[clamp(3rem,10vw,3.75rem)] bg-muted rounded-[clamp(0.75rem,3vw,1.25rem)] animate-pulse" />
                        </div>
                      ) : subError === 'unavailable' ? (
                        /* ── Hard error: no data at all ── */
                        <div className="rounded-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,4vw,1.5rem)] border border-destructive/30 bg-destructive/10 text-center space-y-[clamp(0.75rem,3vw,1rem)]">
                          <p className="text-[clamp(0.875rem,3vw,1.125rem)] font-bold text-foreground">Status Langganan Tidak Tersedia</p>
                          <p className="text-[clamp(0.75rem,2.5vw,0.9375rem)] text-muted-foreground leading-relaxed">
                            Tidak dapat memuat informasi langganan. Periksa koneksimu dan coba lagi.
                          </p>
                          <button
                            onClick={loadSubscription}
                            aria-label="Coba lagi muat status langganan"
                            className="inline-flex items-center justify-center gap-2 font-bold text-primary text-[clamp(0.8125rem,2.5vw,0.9375rem)] hover:underline min-h-[44px] min-w-[44px] px-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            <Loader2 size={16} strokeWidth={2.5} /> Coba Lagi
                          </button>
                        </div>
                      ) : subError === 'offline' ? (
                        /* ── Offline error ── */
                        <div className="rounded-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,4vw,1.5rem)] border border-orange-300/40 bg-orange-50/60 dark:bg-orange-900/20 dark:border-orange-500/30 text-center space-y-[clamp(0.75rem,3vw,1rem)]">
                          <p className="text-[clamp(0.875rem,3vw,1.125rem)] font-bold text-foreground">Kamu Sedang Offline</p>
                          <p className="text-[clamp(0.75rem,2.5vw,0.9375rem)] text-muted-foreground leading-relaxed">
                            Periksa koneksi internetmu, lalu coba lagi.
                          </p>
                          <button
                            onClick={loadSubscription}
                            aria-label="Coba lagi muat status langganan"
                            className="inline-flex items-center justify-center gap-2 font-bold text-primary text-[clamp(0.8125rem,2.5vw,0.9375rem)] hover:underline min-h-[44px] min-w-[44px] px-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                          >
                            <Loader2 size={16} strokeWidth={2.5} /> Coba Lagi
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Stale-data soft warning */}
                          {subError === 'stale' && (
                            <div className="rounded-xl px-[clamp(0.875rem,3vw,1.125rem)] py-[clamp(0.5rem,2vw,0.75rem)] border border-orange-300/40 bg-orange-50/60 dark:bg-orange-900/20 dark:border-orange-500/30 flex items-center justify-between gap-3">
                              <p className="text-[clamp(0.75rem,2.5vw,0.875rem)] text-muted-foreground leading-snug">
                                Data mungkin belum terkini. Ketuk untuk muat ulang.
                              </p>
                              <button
                                onClick={loadSubscription}
                                aria-label="Muat ulang status langganan"
                                className="inline-flex items-center justify-center text-primary font-bold text-[clamp(0.75rem,2.5vw,0.875rem)] whitespace-nowrap hover:underline min-h-[44px] min-w-[44px] px-4 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 flex-shrink-0"
                              >
                                Muat Ulang
                              </button>
                            </div>
                          )}

                          {/* ── Plan + status card ── */}
                          {(() => {
                            const st = subStatus?.subscription_status;
                            const isActive   = st === 'active';
                            const isArchived = st === 'archived';
                            // dot colour + label
                            const dot   = isActive ? '🟢' : isArchived ? '🔴' : '🟡';
                            const label = isActive
                              ? 'Aktif'
                              : isArchived
                                ? 'Berakhir'
                                : 'Belum Berlangganan';
                            const planName = isActive && subStatus?.subscription_plan
                              ? (subStatus.subscription_plan === 'monthly' ? 'Paket Bulanan' : 'Paket Tahunan')
                              : isArchived
                                ? 'Langganan Berakhir'
                                : 'TemanNyatet Free';
                            return (
                              <div className={`rounded-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,4vw,1.5rem)] border ${
                                isActive   ? 'bg-primary/10 border-primary/30'
                                : isArchived ? 'bg-destructive/10 border-destructive/30'
                                : 'bg-secondary border-border'
                              }`}>
                                <div className="flex items-center gap-[clamp(0.75rem,3vw,1rem)]">
                                  <div className={`rounded-xl flex items-center justify-center flex-shrink-0 w-[clamp(2.75rem,10vw,3.5rem)] h-[clamp(2.75rem,10vw,3.5rem)] text-[clamp(1.25rem,4vw,1.75rem)] ${
                                    isActive ? 'bg-primary/20' : 'bg-background'
                                  }`}>
                                    {isActive ? <Crown size={22} className="text-primary" strokeWidth={2.2} /> : dot}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`font-extrabold uppercase tracking-widest text-[clamp(0.625rem,2vw,0.75rem)] ${
                                      isActive ? 'text-primary' : isArchived ? 'text-destructive' : 'text-muted-foreground'
                                    }`}>
                                      {dot} {label}
                                    </p>
                                    <p className="text-[clamp(0.875rem,3vw,1.125rem)] font-extrabold text-foreground mt-[clamp(0.125rem,0.5vw,0.25rem)] leading-tight">
                                      {planName}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}

                          {(() => {
                            const credits = subStatus?.credit_balance ?? 0;
                            const isEmpty = credits === 0;
                            const isLow = credits > 0 && credits <= 2;
                            const tone = isEmpty
                              ? 'border-border bg-secondary'
                              : isLow
                                ? 'border-orange-500/25 bg-orange-500/[0.07]'
                                : 'border-primary/20 bg-primary/[0.07]';
                            const toneText = isEmpty
                              ? 'text-muted-foreground'
                              : isLow
                                ? 'text-orange-700 dark:text-orange-300'
                                : 'text-primary';
                            return (
                              <div className={`rounded-[clamp(1rem,3vw,1.5rem)] border px-[clamp(1rem,4vw,1.5rem)] py-[clamp(1rem,4vw,1.35rem)] ${tone}`}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isEmpty ? 'bg-muted' : isLow ? 'bg-orange-500/15' : 'bg-primary/15'} ${toneText}`}>
                                      <Sparkles size={18} strokeWidth={2.3} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-extrabold text-foreground">Credit Ringkas AI</p>
                                      <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                                        {isEmpty ? 'Siapkan credit untuk ringkasan berikutnya' : '1 credit untuk 1 ringkasan catatan atau transaksi'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-2xl font-black leading-none tabular-nums ${toneText}`}>{credits}</p>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">tersisa</p>
                                  </div>
                                </div>
                                <div className="mt-4 flex gap-1" aria-label={`${credits} credit tersisa`}>
                                  {Array.from({ length: Math.min(Math.max(credits, 1), 10) }).map((_, index) => (
                                    <span
                                      key={index}
                                      className={`h-1.5 flex-1 rounded-full ${index < credits ? (isLow ? 'bg-orange-400' : 'bg-primary') : 'bg-muted-foreground/15'}`}
                                    />
                                  ))}
                                </div>
                                <p className={`mt-3 text-xs font-semibold ${toneText}`}>
                                  {isEmpty ? 'Credit habis' : isLow ? 'Tinggal sedikit — pertimbangkan top-up' : 'Masih cukup untuk beberapa ringkasan'}
                                </p>
                                {/* Top Up shortcut */}
                                <button
                                  type="button"
                                  onClick={() => setActiveSection('topup')}
                                  className="mt-3 w-full rounded-xl border border-border bg-card py-2.5 text-xs font-bold text-foreground hover:bg-secondary/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                                >
                                  <Sparkles size={12} className="inline mr-1.5 align-[-1px] text-primary" strokeWidth={2.5} />
                                  Top Up AI Credit
                                </button>
                                <AiSummaryDetails variant="compact" className="mt-3" />
                              </div>
                            );
                          })()}

                          {/* Detail rows — only meaningful for active subs */}
                          {subStatus?.subscription_status === 'active' && (
                            <div className="space-y-[clamp(0.5rem,2vw,0.75rem)]">
                              {subStatus.days_remaining !== null && (
                                <div className="flex items-center justify-between rounded-xl bg-secondary/60 border border-border px-[clamp(0.875rem,3vw,1.125rem)] py-[clamp(0.625rem,2vw,0.875rem)]">
                                  <div className="flex items-center gap-[clamp(0.5rem,2vw,0.75rem)] text-muted-foreground">
                                    <Sparkles size={16} strokeWidth={2.2} className="w-[clamp(0.875rem,3vw,1rem)] h-[clamp(0.875rem,3vw,1rem)]" />
                                    <span className="text-[clamp(0.8125rem,2.5vw,0.9375rem)] font-bold">Sisa hari</span>
                                  </div>
                                  <span className="text-[clamp(0.9375rem,3vw,1.125rem)] font-extrabold text-foreground">
                                    {subStatus.days_remaining} hari
                                  </span>
                                </div>
                              )}
                              {subStatus.subscription_end && (
                                <div className="flex items-center justify-between rounded-xl bg-secondary/60 border border-border px-[clamp(0.875rem,3vw,1.125rem)] py-[clamp(0.625rem,2vw,0.875rem)]">
                                  <div className="flex items-center gap-[clamp(0.5rem,2vw,0.75rem)] text-muted-foreground">
                                    <Calendar size={16} strokeWidth={2.2} className="w-[clamp(0.875rem,3vw,1rem)] h-[clamp(0.875rem,3vw,1rem)]" />
                                    <span className="text-[clamp(0.8125rem,2.5vw,0.9375rem)] font-bold">
                                      {subStatus.days_remaining !== null && subStatus.days_remaining > 0
                                        ? 'Perpanjang otomatis'
                                        : 'Berakhir pada'}
                                    </span>
                                  </div>
                                  <span className="text-[clamp(0.8125rem,2.5vw,0.9375rem)] font-extrabold text-foreground text-right">
                                    {new Date(subStatus.subscription_end).toLocaleDateString('id-ID', {
                                      day: 'numeric', month: 'long', year: 'numeric',
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ── CTA button — context-sensitive ── */}
                          {(() => {
                            const st = subStatus?.subscription_status;

                            if (st === 'active') {
                              return (
                                <div className="space-y-2">
                                  <Button
                                    onClick={() => { setOpen(false); setLocation('/subscription'); }}
                                    className="w-full gap-2"
                                    size="lg"
                                  >
                                    <Crown size={16} strokeWidth={2.5} />
                                    Kelola Selengkapnya
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => void handleSubscriptionCheckout(subStatus?.subscription_plan ?? 'yearly')}
                                    disabled={checkoutLoading}
                                    className="w-full gap-2"
                                    size="lg"
                                  >
                                    <Calendar size={16} strokeWidth={2.5} />
                                    {checkoutLoading ? 'Menyiapkan pembayaran…' : 'Perpanjang Langganan'}
                                  </Button>
                                </div>
                              );
                            }

                            if (st === 'archived') {
                              return (
                                <div className="space-y-2">
                                  <Button
                                    onClick={() => { setOpen(false); setLocation('/subscription'); }}
                                    variant="outline"
                                    className="w-full gap-2"
                                    size="lg"
                                  >
                                    <Crown size={16} strokeWidth={2.5} />
                                    Kelola Selengkapnya
                                  </Button>
                                  <Button
                                    onClick={() => void handleSubscriptionCheckout('yearly')}
                                    disabled={checkoutLoading}
                                    className="w-full gap-2"
                                    size="lg"
                                  >
                                    <Sparkles size={16} strokeWidth={2.5} />
                                    {checkoutLoading ? 'Menyiapkan pembayaran…' : 'Perpanjang Langganan'}
                                  </Button>
                                </div>
                              );
                            }

                            // Pending / free: navigate to payment onboarding page (correct for pending)
                            return (
                              <div className="space-y-2">
                                <Button
                                  onClick={() => { setOpen(false); setLocation('/payment'); }}
                                  className="w-full gap-2"
                                  size="lg"
                                >
                                  <Sparkles size={16} strokeWidth={2.5} />
                                  Upgrade ke PRO
                                </Button>
                                <Button
                                  onClick={() => { setOpen(false); setLocation('/subscription'); }}
                                  variant="outline"
                                  className="w-full gap-2"
                                  size="lg"
                                >
                                  <Crown size={16} strokeWidth={2.5} />
                                  Lihat Informasi Langganan
                                </Button>
                              </div>
                            );
                          })()}

                          {/* Contextual helper text */}
                          {subStatus?.subscription_status === 'pending' && (
                            <p className="text-[clamp(0.6875rem,2vw,0.8125rem)] text-muted-foreground text-center leading-relaxed">
                              Akun kamu belum di-upgrade. Pilih paket untuk membuka semua fitur.
                            </p>
                          )}
                          {subStatus?.subscription_status === 'archived' && (
                            <p className="text-[clamp(0.6875rem,2vw,0.8125rem)] text-muted-foreground text-center leading-relaxed">
                              Langganan kamu sudah berakhir. Data kamu tetap tersimpan — aktifkan kembali kapan saja.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  ) : activeSection === 'topup' ? (
                    <div className="pt-[clamp(0.25rem,1vw,0.5rem)]">
                      <TopUpSection
                        creditBalance={subStatus?.credit_balance ?? 0}
                      />
                    </div>
                  ) : (
                    <div className="pt-[clamp(0.25rem,1vw,0.5rem)] space-y-[clamp(1rem,3vw,1.5rem)]">
                      <div>
                        <label className="text-[clamp(0.625rem,2vw,0.75rem)] font-bold text-muted-foreground uppercase tracking-widest mb-[clamp(0.25rem,1vw,0.5rem)] block">Laporkan Bug / Saran</label>
                        <textarea
                          value={feedbackInput}
                          onChange={e => setFeedbackInput(e.target.value)}
                          placeholder="Jelaskan bug yang kamu temui atau saran kamu di sini..."
                          className={`${INP} min-h-[8rem] resize-none`}
                          autoFocus
                        />
                      </div>
                      <Button
                        onClick={handleSendFeedback}
                        className="w-full"
                        size="lg"
                      >
                        Kirim Feedback
                      </Button>
                      <p className="text-[clamp(0.75rem,2.5vw,1rem)] text-muted-foreground text-center">
                        Akan membuka aplikasi email dengan alamat tujuan <strong className="text-foreground">rhn.rmdhniii@gmail.com</strong>.
                      </p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
