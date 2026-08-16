import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Check,
  Link2,
  ListTodo,
  Mic,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthDialog from '@/components/AuthDialog';

const NAV_LINKS = [
  { href: '#fitur', label: 'Fitur' },
  { href: '#cara-kerja', label: 'Cara Kerja' },
];

const FEATURES = [
  {
    icon: StickyNote,
    title: 'Catatan instan',
    desc: 'Tangkap ide dengan mengetik atau langsung bicara. Tersimpan otomatis, mudah dicari.',
    tint: 'bg-primary/10 text-primary',
    border: 'border-primary/15',
  },
  {
    icon: Wallet,
    title: 'Keuangan yang ngalir',
    desc: 'Pemasukan dan pengeluaran tercatat rapi. Ringkasan bulanan otomatis, tanpa spreadsheet.',
    tint: 'bg-finance/12 text-finance-text',
    border: 'border-finance/20',
  },
  {
    icon: ListTodo,
    title: 'To-Do yang beres',
    desc: 'Checklist harian dengan progress yang jelas. Fokus selesaikan, bukan mengingat.',
    tint: 'bg-todo/10 text-todo-text',
    border: 'border-todo/20',
  },
  {
    icon: Link2,
    title: 'Link Saver',
    desc: 'Simpan tautan penting dan akses kapan saja, tersusun rapi di satu tempat.',
    tint: 'bg-linksaver/10 text-linksaver-text',
    border: 'border-linksaver/20',
  },
];

const STEPS = [
  {
    num: '01',
    title: 'Buat akun gratis',
    desc: 'Daftar dengan email — dua menit, tanpa kartu kredit.',
  },
  {
    num: '02',
    title: 'Catat dengan ketik atau suara',
    desc: 'Tulis catatan, atau cukup bicara: TemanNyatet yang merapikan.',
  },
  {
    num: '03',
    title: 'Pantau dan beres',
    desc: 'Keuangan, to-do, dan link terpantau dari satu dashboard.',
  },
];

const TRUST_POINTS = ['Gratis untuk memulai', 'Tanpa kartu kredit', 'Data tetap milikmu'];

export default function LandingPage() {
  const [location, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'login' | 'register'>('login');

  // Direct visit to /login (e.g. from an email confirmation link) → show the
  // landing page with the auth dialog already open.
  useEffect(() => {
    if (location === '/login') setDialogOpen(true);
  }, [location]);

  const openAuth = (mode: 'login' | 'register') => {
    setDialogMode(mode);
    setDialogOpen(true);
  };

  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    // Closing the dialog on the /login route returns to the landing page so
    // the URL no longer advertises an open login interface.
    if (!open && location === '/login') setLocation('/');
  };

  const handleSuccess = () => setDialogOpen(false);

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Sticky glass header ─────────────────────────────────────────── */}
      <header className="app-page-header">
        <div className="app-page-header-inner">
          <a href="#top" className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-elevation-1">
              <BookOpen size={17} className="text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
              TemanNyatet
            </span>
          </a>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="min-h-11 rounded-xl px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => openAuth('login')}
            >
              Masuk
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => openAuth('register')}
              className="hidden sm:inline-flex"
            >
              Mulai Gratis
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={() => openAuth('register')}
              className="sm:hidden"
              aria-label="Mulai Gratis"
            >
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ── Hero ──────────────────────────────────────────────────────── */}
        <section className="relative isolate overflow-hidden">
          {/* Warm background shapes */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-[-6rem] h-96 w-96 rotate-[-18deg] rounded-[38%_62%_55%_45%] bg-primary/8 sm:h-[28rem] sm:w-[28rem]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-40 h-[26rem] w-[26rem] rotate-[22deg] rounded-[58%_42%_44%_56%] bg-finance/10 sm:h-[30rem] sm:w-[30rem]" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-todo/6 blur-3xl" />

          <div className="relative mx-auto grid w-full max-w-screen-xl items-center gap-14 px-5 pb-20 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-2 lg:gap-10 lg:px-10 lg:pb-28 lg:pt-24">
            {/* Copy */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5">
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary">
                  Catatan + Keuangan + To-Do, satu aplikasi
                </span>
              </div>

              <h1 className="text-display mt-5 text-[calc(2.5rem*var(--text-scale))] sm:text-[calc(3.25rem*var(--text-scale))] lg:text-[calc(3.75rem*var(--text-scale))]">
                Catat sat-set,{' '}
                <span className="bg-gradient-to-r from-primary to-finance-text bg-clip-text text-transparent">
                  urusan beres
                </span>
                .
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
                Catatan, keuangan, to-do, dan link — semua di satu tempat. Ketik atau
                langsung bicara, TemanNyatet yang merapikan.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => openAuth('register')}
                  className="w-full rounded-xl sm:w-auto"
                >
                  Mulai Gratis
                  <ArrowRight size={17} />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => openAuth('login')}
                  className="w-full rounded-xl sm:w-auto"
                >
                  Masuk
                </Button>
              </div>

              <ul className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Check size={14} className="text-income" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Phone mockup */}
            <div aria-hidden="true" className="relative mx-auto w-full max-w-[21rem] lg:max-w-none">
              <PhoneMockup />
            </div>
          </div>
        </section>

        {/* ── 4-in-1 strip ───────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-screen-xl px-5 sm:px-6 lg:px-10">
          <div className="grid gap-3 rounded-[1.75rem] border border-border/70 bg-card p-3 shadow-elevation-1 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className={`flex items-start gap-3 rounded-2xl border ${feature.border} p-4`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${feature.tint}`}>
                  <feature.icon size={19} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────────── */}
        <section id="fitur" className="mx-auto w-full max-w-screen-xl scroll-mt-24 px-5 py-20 sm:px-6 lg:px-10 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-pill-label">Fitur</p>
            <h2 className="text-page-title mt-2">Semua yang kamu catat, tersusun rapi</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Empat alat dalam satu aplikasi — dirancang agar mencatat terasa ringan,
              bukan seperti pekerjaan rumah.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-[1.5rem] border border-card-border bg-card p-6 shadow-elevation-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevation-2 sm:p-7"
              >
                <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${feature.tint} transition-transform duration-200 group-hover:scale-105`}>
                  <feature.icon size={22} />
                </span>
                <h3 className="text-section-title mt-5">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* Voice highlight */}
          <div className="mt-4 flex flex-col items-start gap-5 rounded-[1.5rem] border border-primary/20 bg-primary/6 p-6 sm:flex-row sm:items-center sm:p-7">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-elevation-1">
              <Mic size={22} />
            </span>
            <div>
              <h3 className="text-section-title">Bicara saja, langsung tercatat</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                Cukup tekan mic dan bilang{' '}
                <span className="font-medium text-foreground">"belanja mingguan 150 ribu"</span> —
                jadi catatan keuangan yang rapi, otomatis.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => openAuth('register')}
              className="w-full sm:ml-auto sm:w-auto"
            >
              Coba sekarang
            </Button>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────────────── */}
        <section id="cara-kerja" className="border-y border-border/60 bg-surface/60 scroll-mt-24">
          <div className="mx-auto w-full max-w-screen-xl px-5 py-20 sm:px-6 lg:px-10 lg:py-28">
            <div className="max-w-2xl">
              <p className="text-pill-label">Cara Kerja</p>
              <h2 className="text-page-title mt-2">Mulai dalam tiga langkah</h2>
            </div>

            <ol className="mt-10 grid gap-4 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.num} className="rounded-[1.5rem] border border-card-border bg-card p-6 shadow-elevation-1 sm:p-7">
                  <span className="font-display text-3xl font-semibold tracking-[-0.03em] text-primary/40">
                    {step.num}
                  </span>
                  <h3 className="text-section-title mt-4">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────────── */}
        <section className="mx-auto w-full max-w-screen-xl px-5 py-20 sm:px-6 lg:px-10 lg:py-24">
          <div className="relative isolate overflow-hidden rounded-[2rem] bg-primary px-6 py-14 text-center shadow-elevation-2 sm:px-10 sm:py-16">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 -left-10 h-64 w-64 rounded-full bg-black/10 blur-2xl" />

            <div className="relative">
              <h2 className="font-display text-[calc(1.9rem*var(--text-scale))] font-semibold leading-tight tracking-[-0.03em] text-primary-foreground sm:text-[calc(2.4rem*var(--text-scale))]">
                Siap beres-beres catatanmu?
              </h2>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-primary-foreground/80 sm:text-base">
                Gabung gratis dan mulai mencatat sat-set — dari mana saja, di HP atau desktop.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Button
                  type="button"
                  size="lg"
                  onClick={() => openAuth('register')}
                  className="w-full rounded-xl bg-background text-foreground shadow-elevation-2 hover:bg-background/92 sm:w-auto"
                >
                  Mulai Gratis
                  <ArrowRight size={17} />
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="ghost"
                  onClick={() => openAuth('login')}
                  className="w-full rounded-xl text-primary-foreground hover:bg-white/10 hover:text-primary-foreground sm:w-auto"
                >
                  Masuk
                </Button>
              </div>
              <p className="mt-6 flex items-center justify-center gap-1.5 text-xs font-medium text-primary-foreground/70">
                <ShieldCheck size={14} />
                Data kamu tetap aman dan milikmu.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col items-center gap-6 px-5 py-10 sm:flex-row sm:justify-between sm:px-6 lg:px-10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BookOpen size={15} className="text-primary-foreground" />
            </span>
            <span className="font-display text-sm font-semibold text-foreground">TemanNyatet</span>
          </div>

          <nav aria-label="Tautan footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <a href="#fitur" className="min-h-9 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Fitur
            </a>
            <Link href="/terms-of-service" className="min-h-9 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="min-h-9 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground">© 2026 TemanNyatet</p>
        </div>
      </footer>

      {/* ── Integrated auth dialog ──────────────────────────────────────── */}
      <AuthDialog
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        initialMode={dialogMode}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

/* ── Decorative phone mockup ─────────────────────────────────────────── */
function PhoneMockup() {
  return (
    <div className="relative">
      {/* Floating voice chip */}
      <motion.div
        className="absolute -left-4 top-14 z-20 hidden items-center gap-2.5 rounded-2xl border border-card-border bg-card px-4 py-3 shadow-elevation-2 sm:flex lg:-left-10"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Mic size={15} />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">"belanja mingguan 150rb"</p>
          <p className="text-[10px] font-medium text-income">Tercatat sebagai pengeluaran ✓</p>
        </div>
      </motion.div>

      {/* Floating todo chip */}
      <motion.div
        className="absolute -right-3 bottom-20 z-20 hidden items-center gap-2.5 rounded-2xl border border-card-border bg-card px-4 py-3 shadow-elevation-2 sm:flex lg:-right-8"
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-income text-white">
          <Check size={15} />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">3 dari 5 tugas beres</p>
          <p className="text-[10px] font-medium text-muted-foreground">Progress minggu ini</p>
        </div>
      </motion.div>

      {/* Device frame */}
      <div className="relative mx-auto w-[17rem] rounded-[2.75rem] border border-border/70 bg-background p-2.5 shadow-elevated sm:w-[18.5rem]">
        <div className="overflow-hidden rounded-[2.25rem] border border-border/50 bg-card">
          {/* Status bar */}
          <div className="flex items-center justify-between border-b border-border/50 px-5 pb-2.5 pt-3.5">
            <span className="text-[11px] font-semibold text-foreground">9:41</span>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />
              <span className="h-2 w-2 rounded-full bg-finance" />
              <span className="h-2 w-2 rounded-full bg-todo" />
            </div>
          </div>

          <div className="space-y-3.5 px-4 py-4">
            {/* Greeting */}
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground">Halo, Rina 👋</p>
                <p className="font-display text-sm font-semibold text-foreground">Catatan kamu aman</p>
              </div>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                R
              </span>
            </div>

            {/* Balance card */}
            <div className="rounded-2xl bg-primary p-4 text-primary-foreground">
              <p className="text-[10px] font-medium text-primary-foreground/75">Saldo bulan ini</p>
              <p className="font-display mt-1 text-xl font-semibold tracking-[-0.02em]">Rp 4.820.500</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-semibold">+ Rp 2.400.000</span>
                <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-semibold">− Rp 1.275.000</span>
              </div>
            </div>

            {/* Notes */}
            <div className="px-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Catatan</p>
              <div className="mt-2 space-y-2">
                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: 'var(--note-card-1)', borderColor: 'var(--note-card-1-border)', color: 'var(--note-card-1-foreground)' }}
                >
                  <p className="text-xs font-semibold">Ide aplikasi baru 💡</p>
                  <p className="mt-0.5 text-[10px] opacity-70">Voice note • 2 menit lalu</p>
                </div>
                <div
                  className="rounded-xl border p-3"
                  style={{ backgroundColor: 'var(--note-card-2)', borderColor: 'var(--note-card-2-border)', color: 'var(--note-card-2-foreground)' }}
                >
                  <p className="text-xs font-semibold">Belanja mingguan 🛒</p>
                  <p className="mt-0.5 text-[10px] opacity-70">Keuangan • Kemarin</p>
                </div>
              </div>
            </div>

            {/* Todo */}
            <div className="rounded-xl border border-border/60 bg-surface/70 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Beres-beres kamar</p>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-income text-white">
                  <Check size={11} />
                </span>
              </div>
              <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full w-[60%] rounded-full bg-todo" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
