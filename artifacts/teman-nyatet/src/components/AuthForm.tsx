import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { getEmailRedirectUrl } from '@/lib/siteUrl';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'wouter';
import { FormError } from '@/components/PageStates';
import { Button } from '@/components/ui/button';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter'),
});

const registerSchema = loginSchema
  .extend({
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Password tidak cocok',
    path: ['confirmPassword'],
  });

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const INPUT_CLASS =
  'min-h-12 w-full rounded-xl border border-border bg-background px-4 py-3.5 text-base shadow-elevation-1 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 sm:px-5';

type AuthFormProps = {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  onSuccess?: () => void;
};

export default function AuthForm({ mode, onModeChange, onSuccess }: AuthFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [confirmedFromEmail, setConfirmedFromEmail] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(mode === 'login' ? loginSchema : registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
    // Validate as soon as a field is touched (not only on submit) so mobile
    // users see format errors before the keyboard closes, instead of losing
    // scroll position after tapping submit.
    mode: 'onTouched',
    reValidateMode: 'onChange',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === 'true') {
      setConfirmedFromEmail(true);
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

  // Switching tabs resets the form so leftover values or validation from the
  // previous mode never leak into the other one.
  useEffect(() => {
    form.reset();
    setShowPassword(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const mapAuthError = (message: string): string => {
    if (message.includes('Invalid login credentials')) return 'Email atau password salah';
    if (message.includes('Email not confirmed')) return 'Silakan verifikasi email Anda terlebih dahulu sebelum login.';
    if (message.includes('User already registered')) return 'Email sudah terdaftar.';
    if (message.includes('Password should be at least 6 characters')) return 'Password minimal 6 karakter.';
    return message;
  };

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      if (mode === 'login') {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        if (signInData.user && !signInData.user.email_confirmed_at) {
          setPendingEmail(signInData.user.email || data.email);
          await supabase.auth.signOut();
          toast.error('Silakan verifikasi email Anda terlebih dahulu sebelum login.');
          return;
        }
        toast.success('Berhasil masuk!');
        onSuccess?.();
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { emailRedirectTo: getEmailRedirectUrl('/login?confirmed=true') },
        });
        if (error) throw error;
        if (signUpData.session && !signUpData.user?.email_confirmed_at) {
          await supabase.auth.signOut();
          setPendingEmail(data.email);
          toast.success('Pendaftaran berhasil — silakan cek email Anda dan klik link konfirmasi sebelum masuk.');
        } else if (signUpData.session) {
          toast.success('Pendaftaran berhasil!');
          onSuccess?.();
        } else {
          setPendingEmail(data.email);
          toast.success('Pendaftaran berhasil — silakan cek email Anda dan klik link konfirmasi sebelum masuk.');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      if (message.includes('Email not confirmed')) setPendingEmail(data.email);
      toast.error(mapAuthError(message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingEmail) { toast.error('Email tidak ditemukan'); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: { emailRedirectTo: getEmailRedirectUrl('/login?confirmed=true') },
      });
      if (error) throw error;
      toast.success('Email verifikasi telah dikirim ulang. Silakan cek inbox Anda.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengirim ulang email verifikasi');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    const email = form.getValues('email');
    if (!email) { toast.error('Masukkan email terlebih dahulu'); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: getEmailRedirectUrl('/login'),
      });
      if (error) throw error;
      toast.success('Link reset password dikirim ke email!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Email confirmed banner */}
      <AnimatePresence>
        {confirmedFromEmail && !pendingEmail && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5 flex items-center gap-3 overflow-hidden rounded-xl border border-income/20 bg-income/8 px-4 py-3"
          >
            <CheckCircle2 size={18} className="shrink-0 text-income" />
            <div>
              <p className="text-sm font-semibold text-income">Email berhasil diverifikasi!</p>
              <p className="text-xs text-income/80">Silakan masuk dengan akun kamu.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {pendingEmail ? (
          /* ── Email verification waiting state ── */
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
            className="flex flex-col items-center py-4 text-center"
          >
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Mail size={28} className="text-primary" />
            </div>
            <h2 className="text-section-title">Cek email kamu</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Link konfirmasi dikirim ke{' '}
              <strong className="font-semibold text-foreground">{pendingEmail}</strong>.
              Klik link tersebut untuk mengaktifkan akun kamu.
            </p>

            <div className="mt-6 w-full space-y-3">
              <Button
                type="button"
                onClick={() => void handleResendVerification()}
                disabled={isLoading}
                size="lg"
                variant="outline"
                className="w-full rounded-xl"
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <><Mail size={16} /> Kirim Ulang Email</>}
              </Button>
              <button
                type="button"
                onClick={() => { setPendingEmail(''); form.reset(); }}
                className="flex w-full items-center justify-center gap-1.5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft size={15} /> Kembali ke login
              </button>
            </div>
          </motion.div>
        ) : (
          /* ── Login / Register form ── */
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.22, ease: 'easeOut' }}
          >
            {/* Tab switcher */}
            <div className="mb-6 flex rounded-xl bg-secondary p-1">
              {(['login', 'register'] as const).map((tabMode) => {
                const active = tabMode === mode;
                return (
                  <button
                    key={tabMode}
                    type="button"
                    onClick={() => onModeChange(tabMode)}
                    aria-pressed={active}
                    className="relative flex-1 rounded-[0.625rem] py-3 text-sm font-semibold transition-colors duration-200 active:scale-[0.97]"
                  >
                    {active && (
                      <motion.span
                        layoutId="auth-mode-pill"
                        className="absolute inset-0 rounded-[0.625rem] bg-card shadow-elevation-1"
                        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
                      />
                    )}
                    <span
                      className={`relative z-10 transition-colors duration-200 ${
                        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {tabMode === 'login' ? 'Masuk' : 'Daftar'}
                    </span>
                  </button>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                onSubmit={form.handleSubmit(onSubmit)}
                initial={{ opacity: 0, x: mode === 'login' ? -10 : 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === 'login' ? 10 : -10 }}
                transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
                className="space-y-4"
              >
                {/* Email */}
                <div>
                  <label htmlFor="auth-email" className="text-pill-label mb-2 ml-1 block">
                    Email
                  </label>
                  <input
                    id="auth-email"
                    {...form.register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    className={INPUT_CLASS}
                  />
                  {form.formState.errors.email && (
                    <FormError className="ml-1 mt-1">{form.formState.errors.email.message}</FormError>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="auth-password" className="text-pill-label mb-2 ml-1 block">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      {...form.register('password')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      placeholder="Minimal 6 karakter"
                      className={`${INPUT_CLASS} pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                      className="absolute right-1 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {form.formState.errors.password && (
                    <FormError className="ml-1 mt-1">{form.formState.errors.password.message}</FormError>
                  )}
                </div>

                {/* Confirm password (register only) */}
                {mode === 'register' && (
                  <div>
                    <label htmlFor="auth-confirm-password" className="text-pill-label mb-2 ml-1 block">
                      Konfirmasi password
                    </label>
                    <input
                      id="auth-confirm-password"
                      {...form.register('confirmPassword')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Ulangi password"
                      className={INPUT_CLASS}
                    />
                    {form.formState.errors.confirmPassword && (
                      <FormError className="ml-1 mt-1">{form.formState.errors.confirmPassword.message}</FormError>
                    )}
                  </div>
                )}

                {/* Forgot password */}
                {mode === 'login' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleResetPassword()}
                      className="min-h-11 px-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
                    >
                      Lupa password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  size="lg"
                  className="mt-2 w-full rounded-xl"
                >
                  {isLoading
                    ? <Loader2 className="h-5 w-5 animate-spin" />
                    : (mode === 'login' ? 'Masuk' : 'Buat Akun')}
                </Button>
              </motion.form>
            </AnimatePresence>

            {/* Legal */}
            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              Dengan melanjutkan, kamu menyetujui{' '}
              <Link href="/terms-of-service" className="font-medium text-primary underline-offset-4 hover:underline">
                Terms of Service
              </Link>{' '}
              dan{' '}
              <Link href="/privacy-policy" className="font-medium text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
