import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, BookOpen } from 'lucide-react';

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

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(isLogin ? loginSchema : registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        toast.success('Berhasil masuk!');
      } else {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        toast.success('Pendaftaran berhasil!');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan');
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
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success('Link reset password dikirim ke email!');
    } catch (err: any) {
      toast.error(err.message || 'Gagal reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm flex flex-col items-center">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center mb-6 shadow-soft relative">
             {/* Yellow Notebook Icon Placeholder */}
             <div className="absolute w-12 h-14 bg-[#F4C753] rounded-md shadow-sm border border-[#E0B442] flex items-center justify-center transform -rotate-6">
                <BookOpen size={24} className="text-white" />
             </div>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">TemanNyatet</h1>
          <p className="text-muted-foreground text-base mt-2 font-medium">Catat sat-set, urusan beres.</p>
        </div>

        {/* Form Section */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-4">
          <div>
            <input
              {...form.register('email')}
              type="email"
              placeholder="Email"
              className="w-full px-5 py-4 rounded-[1.25rem] bg-white border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base shadow-sm"
            />
            {form.formState.errors.email && (
              <p className="text-destructive text-sm mt-1 ml-2 font-medium">{form.formState.errors.email.message}</p>
            )}
          </div>

          <div className="relative">
            <input
              {...form.register('password')}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className="w-full px-5 py-4 rounded-[1.25rem] bg-white border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-12 text-base shadow-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-5 top-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
            {form.formState.errors.password && (
              <p className="text-destructive text-sm mt-1 ml-2 font-medium">{form.formState.errors.password.message}</p>
            )}
          </div>

          {!isLogin && (
            <div>
              <input
                {...form.register('confirmPassword')}
                type={showPassword ? "text" : "password"}
                placeholder="Konfirmasi Password"
                className="w-full px-5 py-4 rounded-[1.25rem] bg-white border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-base shadow-sm"
              />
              {form.formState.errors.confirmPassword && (
                <p className="text-destructive text-sm mt-1 ml-2 font-medium">{form.formState.errors.confirmPassword.message}</p>
              )}
            </div>
          )}

          {isLogin && (
            <div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-sm font-bold text-primary hover:underline"
              >
                Lupa password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#F4C753] text-[#4A3D18] font-bold text-lg py-4 rounded-full shadow-soft hover:opacity-90 transition-opacity flex items-center justify-center mt-4"
          >
            {isLoading ? <Loader2 className="animate-spin w-6 h-6" /> : (isLogin ? 'Masuk' : 'Daftar')}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-muted-foreground font-medium">
            {isLogin ? 'Belum punya akun? ' : 'Sudah punya akun? '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                form.reset();
              }}
              className="text-primary font-bold hover:underline"
            >
              {isLogin ? 'Daftar' : 'Masuk'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
