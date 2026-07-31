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
    <main className="min-h-dvh w-full overflow-x-hidden bg-background px-[max(1rem,env(safe-area-inset-left))] py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-10 lg:px-12 landscape:justify-start landscape:overflow-y-auto landscape:py-5">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-md flex-col items-center justify-center sm:min-h-[calc(100dvh-5rem)] landscape:min-h-0 landscape:py-3">

        {/* Logo Section */}
        <div className="mb-8 flex w-full flex-col items-center sm:mb-10 landscape:mb-4">
          <div className="relative mb-4 flex h-[4.5rem] w-[4.5rem] rotate-[-3deg] items-center justify-center rounded-[1.35rem] bg-primary shadow-elevated sm:mb-5 sm:h-20 sm:w-20 sm:rounded-[1.5rem] landscape:mb-3 landscape:h-16 landscape:w-16">
             {/* Yellow Notebook Icon Placeholder */}
             <div className="absolute flex h-12 w-10 -rotate-6 items-center justify-center rounded-md border border-finance-text/50 bg-finance shadow-sm sm:h-14 sm:w-12">
                <BookOpen size={22} className="text-white sm:h-6 sm:w-6" />
             </div>
          </div>
           <h1 className="text-display text-[clamp(1.75rem,7vw,2.25rem)] leading-tight">TemanNyatet</h1>
           <p className="mt-2 text-center text-sm font-medium text-muted-foreground sm:text-base">Catat sat-set, urusan beres.</p>
        </div>

        {confirmedFromEmail && !pendingEmail && (
          <div className="w-full bg-income/10 text-income border border-income/20 rounded-2xl p-4 mb-6 text-center">
            <p className="font-semibold">Email berhasil diverifikasi!</p>
            <p className="text-sm mt-1">Silakan masuk dengan email dan password kamu.</p>
          </div>
        )}

        {pendingEmail ? (
          <div className="w-full text-center space-y-6">
            <div className="w-16 h-16 bg-primary/15 rounded-full flex items-center justify-center mx-auto">
              <Mail size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-section-title">Verifikasi Email Diperlukan</h2>
              <p className="text-muted-foreground mt-2 font-medium">
                Silakan verifikasi email Anda terlebih dahulu sebelum login.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Kami mengirimkan link konfirmasi ke <strong className="text-foreground">{pendingEmail}</strong>.
              </p>
            </div>

            <Button
              type="button"
              onClick={handleResendVerification}
              disabled={isLoading}
              size="lg"
              className="w-full text-lg py-5 rounded-full gap-2"
            >
              {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : <><Mail size={20} /> Kirim Ulang Email Verifikasi</>}
            </Button>

            <button
              type="button"
              onClick={handleBackToLogin}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline transition-colors"
            >
              <ArrowLeft size={16} /> Sudah verifikasi? Kembali ke login
            </button>
          </div>
        ) : (
          <>
            {/* Form Section */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4 sm:space-y-5">
              <div>
                <label htmlFor="auth-email" className="text-pill-label mb-2 block ml-1">Email</label>
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
                <label htmlFor="auth-password" className="text-pill-label mb-2 block ml-1">Password</label>
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
                  className="absolute right-2 top-8 min-h-11 min-w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
                {form.formState.errors.password && (
                  <FormError className="mt-1 ml-2">{form.formState.errors.password.message}</FormError>
                )}
              </div>

              {!isLogin && (
                <div>
                  <label htmlFor="auth-confirm-password" className="text-pill-label mb-2 block ml-1">Konfirmasi password</label>
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
                <div className="flex justify-end mb-2">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="text-sm font-semibold text-primary hover:underline transition-colors"
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
                {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (isLogin ? 'Masuk' : 'Daftar')}
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
                  className="text-primary font-semibold hover:underline transition-colors"
                >
                  {isLogin ? 'Daftar' : 'Masuk'}
                </button>
              </p>
            </div>
          </>
        )}

        <p className="mt-8 max-w-sm px-3 text-center text-xs leading-relaxed text-muted-foreground">
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
