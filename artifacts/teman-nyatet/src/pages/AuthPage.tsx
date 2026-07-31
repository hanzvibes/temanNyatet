import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { getEmailRedirectUrl } from '@/lib/siteUrl';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, BookOpen, Mail, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';
import { FormError } from '@/components/PageStates';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Minimal 6 karakter'),
});

const registerSchema = loginSchema.extend({
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const [confirmedFromEmail, setConfirmedFromEmail] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmed') === 'true') {
      setConfirmedFromEmail(true);
      // Remove the query param from the URL so a refresh does not keep showing the banner.
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  }, []);

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
      if (isLogin) {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;

        // Defense-in-depth: Supabase should reject unverified emails when
        // "Confirm email" is enabled, but we also enforce it client-side so
        // the app never treats an unverified account as logged in.
        if (signInData.user && !signInData.user.email_confirmed_at) {
          setPendingEmail(signInData.user.email || data.email);
          await supabase.auth.signOut();
          toast.error('Silakan verifikasi email Anda terlebih dahulu sebelum login.');
          return;
        }

        toast.success('Berhasil masuk!');
      } else {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: getEmailRedirectUrl('/login?confirmed=true'),
          },
        });
        if (error) throw error;

        if (signUpData.session && !signUpData.user?.email_confirmed_at) {
          // Defense-in-depth: Supabase returned a session but the email is not
          // confirmed. Sign out immediately so the user cannot enter the app
          // unverified, and show the verification UI instead.
          await supabase.auth.signOut();
          setPendingEmail(data.email);
          toast.success('Pendaftaran berhasil — silakan cek email Anda dan klik link konfirmasi sebelum masuk.');
        } else if (signUpData.session) {
          toast.success('Pendaftaran berhasil!');
        } else {
          setPendingEmail(data.email);
          toast.success('Pendaftaran berhasil — silakan cek email Anda dan klik link konfirmasi sebelum masuk.');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan';
      if (message.includes('Email not confirmed')) {
        setPendingEmail(data.email);
      }
      toast.error(mapAuthError(message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!pendingEmail) {
      toast.error('Email tidak ditemukan');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: pendingEmail,
        options: {
          emailRedirectTo: getEmailRedirectUrl('/login?confirmed=true'),
        },
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
    if (!email) {
      toast.error('Masukkan email terlebih dahulu');
      return;
    }

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

  const handleBackToLogin = () => {
    setPendingEmail('');
    form.reset();
  };

  return (
    <main className="relative isolate flex min-h-dvh w-full items-center justify-center overflow-x-hidden bg-background px-[max(1rem,env(safe-area-inset-left))] py-[max(2rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-10 lg:px-12 landscape:items-start landscape:overflow-y-auto landscape:py-5">
      {/* Soft paper-like shapes give the auth screen a distinct identity without
          competing with the form or creating a heavy visual effect. */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-[-5rem] h-72 w-72 rotate-[-18deg] rounded-[38%_62%_55%_45%] bg-primary/10 sm:h-96 sm:w-96" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rotate-[22deg] rounded-[58%_42%_44%_56%] bg-finance/15 sm:h-[28rem] sm:w-[28rem]" />

      <div className="relative z-10 flex w-full max-w-[31rem] flex-col items-center landscape:py-3">
        {/* Brand anchor */}
        <div className="mb-7 flex w-full flex-col items-center sm:mb-8">
          <div className="relative mb-4 flex h-[4.5rem] w-[4.5rem] rotate-[-3deg] items-center justify-center rounded-[1.35rem] bg-primary shadow-elevated sm:h-20 sm:w-20 sm:rounded-[1.5rem]">
            <div className="absolute flex h-12 w-10 -rotate-6 items-center justify-center rounded-md border border-finance-text/50 bg-finance shadow-sm sm:h-14 sm:w-12">
              <BookOpen size={22} className="text-white sm:h-6 sm:w-6" />
            </div>
          </div>
          <h1 className="text-display text-center text-[clamp(1.75rem,7vw,2.25rem)] leading-tight">TemanNyatet</h1>
          <p className="mt-2 text-center text-sm font-medium text-muted-foreground sm:text-base">Catat sat-set, urusan beres.</p>
        </div>

        <div className="w-full rounded-[1.75rem] border border-card-border bg-card p-5 shadow-elevated sm:rounded-[2rem] sm:p-8">
          {confirmedFromEmail && !pendingEmail && (
            <div className="mb-6 rounded-2xl border border-income/20 bg-income/10 p-4 text-center text-income">
              <p className="font-semibold">Email berhasil diverifikasi!</p>
              <p className="mt-1 text-sm">Silakan masuk dengan email dan password kamu.</p>
            </div>
          )}

          {pendingEmail ? (
            <div className="w-full space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <Mail size={32} className="text-primary" />
              </div>
              <div>
                <h2 className="text-section-title">Verifikasi Email Diperlukan</h2>
                <p className="mt-2 font-medium text-muted-foreground">
                  Silakan verifikasi email Anda terlebih dahulu sebelum login.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Kami mengirimkan link konfirmasi ke <strong className="text-foreground">{pendingEmail}</strong>.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleResendVerification}
                disabled={isLoading}
                size="lg"
                className="w-full gap-2 rounded-full py-5 text-lg"
              >
                {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Mail size={20} /> Kirim Ulang Email Verifikasi</>}
              </Button>

              <button
                type="button"
                onClick={handleBackToLogin}
                className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary transition-colors hover:underline"
              >
                <ArrowLeft size={16} /> Sudah verifikasi? Kembali ke login
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4 sm:space-y-5">
                <div>
                  <label htmlFor="auth-email" className="text-pill-label mb-2 ml-1 block">Email</label>
                  <input
                    id="auth-email"
                    {...form.register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="nama@email.com"
                    className="min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3.5 text-base shadow-elevation-1 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 sm:px-5"
                  />
                  {form.formState.errors.email && (
                    <FormError className="mt-1 ml-2">{form.formState.errors.email.message}</FormError>
                  )}
                </div>

                <div className="relative">
                  <label htmlFor="auth-password" className="text-pill-label mb-2 ml-1 block">Password</label>
                  <input
                    id="auth-password"
                    {...form.register('password')}
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    placeholder="Masukkan password"
                    className="min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3.5 pr-12 text-base shadow-elevation-1 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 sm:px-5"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                    className="absolute right-2 top-8 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  {form.formState.errors.password && (
                    <FormError className="mt-1 ml-2">{form.formState.errors.password.message}</FormError>
                  )}
                </div>

                {!isLogin && (
                  <div>
                    <label htmlFor="auth-confirm-password" className="text-pill-label mb-2 ml-1 block">Konfirmasi password</label>
                    <input
                      id="auth-confirm-password"
                      {...form.register('confirmPassword')}
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Ulangi password"
                      className="min-h-12 w-full rounded-xl border border-border bg-card px-4 py-3.5 text-base shadow-elevation-1 outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 sm:px-5"
                    />
                    {form.formState.errors.confirmPassword && (
                      <FormError className="mt-1 ml-2">{form.formState.errors.confirmPassword.message}</FormError>
                    )}
                  </div>
                )}

                {isLogin && (
                  <div className="mb-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      className="min-h-11 px-1 text-sm font-semibold text-primary transition-colors hover:underline"
                    >
                      Lupa password?
                    </button>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isLoading}
                  size="lg"
                  className="mt-4 min-h-12 w-full rounded-xl py-3.5 text-base sm:mt-5"
                >
                  {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : (isLogin ? 'Masuk' : 'Daftar')}
                </Button>
              </form>

              <div className="mt-7 px-2 text-center sm:mt-8">
                <p className="text-sm font-medium text-muted-foreground sm:text-base">
                  {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
                  <button
                    onClick={() => {
                      setIsLogin(!isLogin);
                      form.reset();
                    }}
                    className="font-semibold text-primary transition-colors hover:underline"
                  >
                    {isLogin ? 'Daftar' : 'Masuk'}
                  </button>
                </p>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 max-w-sm px-3 text-center text-xs leading-relaxed text-muted-foreground sm:mt-7">
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
      </div>
    </main>
  );
}
