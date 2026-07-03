import React, { useState } from 'react';
import { Drawer } from 'vaul';
import { supabase } from '@/lib/supabase';
import { useAuthContext } from '@/contexts/AuthContext';
import { ChevronRight, ArrowLeft, LogOut, User, Lock, Phone } from 'lucide-react';
import { toast } from 'sonner';

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

  const INP = 'w-full bg-secondary border border-border rounded-xl py-3 px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm font-bold text-foreground transition-all';

  return (
    <>
      {/* Avatar trigger */}
      <button
        onClick={handleOpen}
        className={`w-12 h-12 rounded-full border-2 border-white flex items-center justify-center font-bold shadow-sm transition-transform active:scale-95 ${avatarBg} ${avatarTextColor}`}
      >
        {initials}
      </button>

      <Drawer.Root open={open} onOpenChange={setOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm" />
          <Drawer.Content className="bg-card flex flex-col rounded-t-[2rem] fixed bottom-0 left-0 right-0 max-h-[88vh] z-50 outline-none">
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-muted-foreground/20 mt-4 mb-2" />

            {/* Header row */}
            <div className="flex items-center px-6 py-3 min-h-[52px]">
              {activeSection ? (
                <button onClick={handleBack} className="flex items-center gap-1.5 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft size={16} strokeWidth={2.5} />
                  Kembali
                </button>
              ) : (
                <h2 className="text-lg font-extrabold text-foreground">Pengaturan</h2>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-10">

              {/* ── Profile header (always visible) ── */}
              {!activeSection && (
                <>
                  <div className="flex flex-col items-center pt-2 pb-6">
                    {/* Big avatar */}
                    <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-2xl font-extrabold shadow-md mb-4">
                      {initials}
                    </div>

                    {/* Subscription badge */}
                    <span className={`text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full mb-3 ${
                      isPro
                        ? 'bg-primary/15 text-primary border border-primary/30'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}>
                      {isPro ? '⭐ PRO' : 'FREE'}
                    </span>

                    {/* Name */}
                    <p className="text-lg font-extrabold text-foreground leading-tight">
                      {profile?.name || <span className="text-muted-foreground font-bold italic text-base">Nama belum diatur</span>}
                    </p>

                    {/* Email */}
                    <p className="text-sm font-medium text-muted-foreground mt-0.5">
                      {user?.email}
                    </p>

                    {/* Phone */}
                    {profile?.phone && (
                      <p className="text-sm font-medium text-muted-foreground mt-0.5">
                        {profile.phone}
                      </p>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-border mb-4" />

                  {/* Menu items */}
                  <div className="space-y-1">
                    {[
                      { key: 'name' as const,     icon: User,  label: 'Ganti Nama' },
                      { key: 'password' as const, icon: Lock,  label: 'Ganti Password' },
                      { key: 'phone' as const,    icon: Phone, label: 'Ganti Nomor HP' },
                    ].map(({ key, icon: Icon, label }) => (
                      <button
                        key={key}
                        onClick={() => handleOpenSection(key)}
                        className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-secondary active:bg-secondary/80 transition-colors text-left"
                      >
                        <div className="w-9 h-9 rounded-xl bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                          <Icon size={17} className="text-muted-foreground" strokeWidth={2.2} />
                        </div>
                        <span className="flex-1 font-bold text-foreground">{label}</span>
                        <ChevronRight size={16} className="text-muted-foreground/50" strokeWidth={2.5} />
                      </button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-border my-4" />

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl hover:bg-red-50 active:bg-red-100/80 transition-colors text-left group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0">
                      <LogOut size={17} className="text-red-500" strokeWidth={2.2} />
                    </div>
                    <span className="flex-1 font-bold text-red-500">Keluar</span>
                  </button>
                </>
              )}

              {/* ── Change Name ── */}
              {activeSection === 'name' && (
                <div className="pt-2 space-y-5">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Nama Baru</label>
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
                    className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-[1.25rem] shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Nama'}
                  </button>
                </div>
              )}

              {/* ── Change Password ── */}
              {activeSection === 'password' && (
                <div className="pt-2 space-y-5">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Password Baru</label>
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
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Konfirmasi Password</label>
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
                    className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-[1.25rem] shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Password'}
                  </button>
                </div>
              )}

              {/* ── Change Phone ── */}
              {activeSection === 'phone' && (
                <div className="pt-2 space-y-5">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">Nomor HP</label>
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
                    className="w-full bg-primary text-primary-foreground font-bold py-4 rounded-[1.25rem] shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {saving ? 'Menyimpan...' : 'Simpan Nomor HP'}
                  </button>
                </div>
              )}

            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}
