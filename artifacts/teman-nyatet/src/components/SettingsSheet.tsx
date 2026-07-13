import React, { useRef, useState } from 'react';
import { Drawer } from 'vaul';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { apiUpload } from '@/lib/apiClient';
import { useAuthContext } from '@/contexts/AuthContext';
import { ChevronRight, ArrowLeft, LogOut, User, Lock, Phone, Camera, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type ActiveSection = null | 'name' | 'password' | 'phone';

interface SettingsSheetProps {
  avatarBg: string;
  avatarTextColor: string;
}

export default function SettingsSheet({ avatarBg, avatarTextColor }: SettingsSheetProps) {
  const { user, profile, refreshProfile } = useAuthContext();
  const [open, setOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<ActiveSection>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.substring(0, 2).toUpperCase() || 'TN';

  const isPro = profile?.subscription_status === 'active';

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
  };

  const handleOpenSection = (section: ActiveSection) => {
    if (section === 'name') setNameInput(profile?.name || '');
    if (section === 'phone') setPhoneInput(profile?.phone || '');
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

  const INP = 'w-full bg-secondary border border-border rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 font-bold text-foreground transition-all py-[clamp(0.625rem,1.8vw,0.875rem)] px-[clamp(0.75rem,3vw,1.25rem)] text-[clamp(0.75rem,2.5vw,1rem)]';

  return (
    <>
      {/* Avatar trigger */}
      <button
        onClick={handleOpen}
        className={`rounded-full border-2 border-white flex items-center justify-center font-bold shadow-sm transition-transform active:scale-95 overflow-hidden w-[clamp(2.5rem,8vw,3.5rem)] h-[clamp(2.5rem,8vw,3.5rem)] text-[clamp(0.75rem,3vw,1rem)] ${avatarBg} ${avatarTextColor}`}
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
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content
            className="bg-card flex flex-col rounded-t-[clamp(1.25rem,4vw,2rem)] fixed bottom-0 left-0 right-0 z-50 outline-none mx-auto w-full sm:max-w-[540px] md:max-w-[600px] lg:max-w-[640px] xl:max-w-[720px] max-h-[min(88vh,48rem)]"
          >
            <div className="mx-auto w-[clamp(2.5rem,8vw,3rem)] h-[clamp(0.25rem,0.8vw,0.375rem)] flex-shrink-0 rounded-full bg-muted-foreground/20 mt-[clamp(0.75rem,2vw,1rem)] mb-[clamp(0.25rem,1vw,0.5rem)]" />

            {/* Header row */}
            <div className="flex items-center px-[clamp(1rem,4vw,1.75rem)] py-[clamp(0.5rem,2vw,0.75rem)] min-h-[clamp(2.75rem,8vw,3.5rem)]">
              {activeSection ? (
                <button onClick={handleBack} className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] text-[clamp(0.8125rem,2.5vw,1rem)] font-bold text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft size={16} strokeWidth={2.5} />
                  Kembali
                </button>
              ) : (
                <h2 className="text-[clamp(1rem,3.5vw,1.5rem)] font-extrabold text-foreground">Pengaturan</h2>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-[clamp(1rem,4vw,1.75rem)] pb-[clamp(1.5rem,5vw,2.5rem)]">

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
                      <div className="flex flex-col items-center pt-[clamp(0.25rem,1vw,0.5rem)] pb-[clamp(1rem,4vw,1.5rem)]">
                        {/* Big avatar */}
                        <div className="relative mb-[clamp(0.75rem,3vw,1.25rem)]">
                          <div className="rounded-full bg-primary flex items-center justify-center text-primary-foreground font-extrabold shadow-md overflow-hidden w-[clamp(4rem,14vw,5.5rem)] h-[clamp(4rem,14vw,5.5rem)] text-[clamp(1.25rem,5vw,2rem)]">
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
                            className="absolute bottom-0 right-0 rounded-full bg-secondary border-2 border-card flex items-center justify-center shadow-sm transition-transform active:scale-95 disabled:opacity-50 w-[clamp(1.5rem,5vw,1.875rem)] h-[clamp(1.5rem,5vw,1.875rem)]"
                          >
                            <Camera size={13} className="text-foreground w-[clamp(0.75rem,2.5vw,0.875rem)] h-[clamp(0.75rem,2.5vw,0.875rem)]" strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Subscription badge */}
                        <span className={`font-extrabold uppercase tracking-widest rounded-full mb-[clamp(0.5rem,2vw,1rem)] text-[clamp(0.625rem,2vw,0.75rem)] px-[clamp(0.75rem,2.5vw,1rem)] py-[clamp(0.25rem,1vw,0.375rem)] ${
                          isPro
                            ? 'bg-primary/15 text-primary border border-primary/30'
                            : 'bg-muted text-muted-foreground border border-border'
                        }`}>
                          {isPro ? '⭐ PRO' : 'FREE'}
                        </span>

                        {/* Name */}
                        <p className="text-[clamp(1rem,3.5vw,1.5rem)] font-extrabold text-foreground leading-tight text-center">
                          {profile?.name || <span className="text-muted-foreground font-bold italic text-[clamp(0.875rem,3vw,1.125rem)]">Nama belum diatur</span>}
                        </p>

                        {/* Email */}
                        <p className="text-[clamp(0.75rem,2.5vw,1rem)] font-medium text-muted-foreground mt-[clamp(0.125rem,0.5vw,0.25rem)] text-center">
                          {user?.email}
                        </p>

                        {/* Phone */}
                        {profile?.phone && (
                          <p className="text-[clamp(0.75rem,2.5vw,1rem)] font-medium text-muted-foreground mt-[clamp(0.125rem,0.5vw,0.25rem)] text-center">
                            {profile.phone}
                          </p>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-border mb-[clamp(0.5rem,2vw,1rem)]" />

                      {/* Menu items */}
                      <div className="space-y-[clamp(0.25rem,1vw,0.5rem)]">
                        {[
                          { key: 'name' as const,     icon: User,  label: 'Ganti Nama' },
                          { key: 'password' as const, icon: Lock,  label: 'Ganti Password' },
                          { key: 'phone' as const,    icon: Phone, label: 'Ganti Nomor HP' },
                        ].map(({ key, icon: Icon, label }) => (
                          <button
                            key={key}
                            onClick={() => handleOpenSection(key)}
                            className="w-full flex items-center gap-[clamp(0.75rem,3vw,1rem)] px-[clamp(0.75rem,3vw,1.25rem)] py-[clamp(0.75rem,3vw,1.25rem)] rounded-[clamp(0.75rem,3vw,1.25rem)] hover:bg-secondary active:bg-secondary/80 transition-colors text-left"
                          >
                            <div className="rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0 w-[clamp(2rem,7vw,2.5rem)] h-[clamp(2rem,7vw,2.5rem)]">
                              <Icon size={18} className="text-muted-foreground w-[clamp(1rem,3.5vw,1.125rem)] h-[clamp(1rem,3.5vw,1.125rem)]" strokeWidth={2.2} />
                            </div>
                            <span className="flex-1 font-bold text-foreground text-[clamp(0.875rem,3vw,1.125rem)]">{label}</span>
                            <ChevronRight size={16} className="text-muted-foreground/50 w-[clamp(1rem,3vw,1.25rem)] h-[clamp(1rem,3vw,1.25rem)]" strokeWidth={2.5} />
                          </button>
                        ))}
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-border my-[clamp(0.5rem,2vw,1rem)]" />

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-[clamp(0.75rem,3vw,1rem)] px-[clamp(0.75rem,3vw,1.25rem)] py-[clamp(0.75rem,3vw,1.25rem)] rounded-[clamp(0.75rem,3vw,1.25rem)] hover:bg-red-50 active:bg-red-100/80 transition-colors text-left group"
                      >
                        <div className="rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 w-[clamp(2rem,7vw,2.5rem)] h-[clamp(2rem,7vw,2.5rem)]">
                          <LogOut size={18} className="text-red-500 w-[clamp(1rem,3.5vw,1.125rem)] h-[clamp(1rem,3.5vw,1.125rem)]" strokeWidth={2.2} />
                        </div>
                        <span className="flex-1 font-bold text-red-500 text-[clamp(0.875rem,3vw,1.125rem)]">Keluar</span>
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
                      <button
                        onClick={handleSaveName}
                        disabled={saving}
                        className="w-full bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 py-[clamp(0.75rem,3vw,1.25rem)] rounded-[clamp(0.75rem,3vw,1.25rem)] text-[clamp(0.875rem,3vw,1.125rem)]"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan Nama'}
                      </button>
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
                      <button
                        onClick={handleSavePassword}
                        disabled={saving}
                        className="w-full bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 py-[clamp(0.75rem,3vw,1.25rem)] rounded-[clamp(0.75rem,3vw,1.25rem)] text-[clamp(0.875rem,3vw,1.125rem)]"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan Password'}
                      </button>
                    </div>
                  ) : (
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
                      <button
                        onClick={handleSavePhone}
                        disabled={saving}
                        className="w-full bg-primary text-primary-foreground font-bold shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50 py-[clamp(0.75rem,3vw,1.25rem)] rounded-[clamp(0.75rem,3vw,1.25rem)] text-[clamp(0.875rem,3vw,1.125rem)]"
                      >
                        {saving ? 'Menyimpan...' : 'Simpan Nomor HP'}
                      </button>
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
