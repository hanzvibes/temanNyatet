import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { getEmailRedirectUrl } from '@/lib/siteUrl';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, BookOpen, Mail, ArrowLeft } from 'lucide-react';
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

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

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
            emailRedirectTo: getEmailRedirectUrl('/login'),
          },
        });
        if (error) throw error;

        if (signUpData.session) {
          // Email confirmations are disabled in Supabase or the user was already confirmed.
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
          emailRedirectTo: getEmailRedirectUrl('/login'),
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
    <div className="min-h-dvh flex flex-col items-center justify-center p-5 sm:p-6 bg-background">
      <div className="w-full max-w-sm flex flex-col items-center">

        {/* Logo Section */}
        <div className="flex flex-col items-center mb-9">
          <div className="w-20 h-20 bg-primary rounded-[1.5rem] flex items-center justify-center mb-5 shadow-elevated relative rotate-[-3deg]">
             {/* Yellow Notebook Icon Placeholder */}
             <div className="absolute w-12 h-14 bg-finance rounded-md shadow-sm border border-finance-text/50 flex items-center justify-center transform -rotate-6">
                <BookOpen size={24} className="text-white" />
             </div>
          </div>
           <h1 className="text-display">TemanNyatet</h1>
          <p className="text-muted-foreground text-base mt-2 font-medium">Catat sat-set, urusan beres.</p>
        </div>

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
              <div>
                <label htmlFor="auth-email" className="text-pill-label mb-2 block ml-1">Email</label>
                <input
                  id="auth-email"
                  {...form.register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder="nama@email.com"
                  className="w-full min-h-12 px-5 py-3.5 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base shadow-elevation-1"
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
                  className="w-full min-h-12 px-5 py-3.5 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12 text-base shadow-elevation-1"
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
                    className="w-full min-h-12 px-5 py-3.5 rounded-xl bg-card border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base shadow-elevation-1"
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
                className="w-full text-base py-5 rounded-xl mt-4"
              >
                {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (isLogin ? 'Masuk' : 'Daftar')}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <p className="text-muted-foreground font-medium">
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
      </div>
    </div>
  );
}
