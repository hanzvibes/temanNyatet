import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Battery,
  Check,
  ChevronRight,
  CirclePlay,
  Eye,
  Heart,
  Home,
  Lightbulb,
  ListTodo,
  Mic,
  MoreVertical,
  NotebookPen,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Signal,
  Sparkles,
  StickyNote,
  User,
  Users,
  Wifi,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthDialog from '@/components/AuthDialog';
import { prefersReducedMotion, usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';

/* ────────────────────────────────────────────────────────────────
   SPRING CONFIG
   ──────────────────────────────────────────────────────────────── */
const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 } as const;
const SPRING_SMOOTH = { type: 'spring', stiffness: 200, damping: 28, mass: 1.0 } as const;
const SPRING_BOUNCY = { type: 'spring', stiffness: 500, damping: 20, mass: 0.6 } as const;

const NAV_LINKS = [
  { id: 'fitur', label: 'Fitur' },
  { id: 'harga', label: 'Harga' },
  { id: 'keamanan', label: 'Keamanan' },
  { id: 'faq', label: 'FAQ' },
];

const HERO_FEATURES = [
  { icon: Sparkles, title: 'AI Summarize', desc: 'Rangkum catatan panjang menjadi inti penting.' },
  { icon: Mic, title: 'Voice Note', desc: 'Catat ide cepat dengan rekaman suara.' },
  { icon: ShieldCheck, title: 'Aman & Privat', desc: 'Data terenkripsi, hanya bisa diakses olehmu.' },
];

const FEATURES = [
  {
    icon: NotebookPen,
    title: 'Catatan Pintar',
    desc: 'Buat catatan cepat & rapi dengan dukungan AI summarize.',
    tint: 'bg-primary/10 text-primary',
  },
  {
    icon: Mic,
    title: 'Voice Note',
    desc: 'Rekam ide atau meeting, otomatis ditranskripsi.',
    tint: 'bg-linksaver/10 text-linksaver-text',
  },
  {
    icon: ShoppingCart,
    title: 'Keuangan',
    desc: 'Catat pemasukan & pengeluaran, pantau saldo bulanan.',
    tint: 'bg-finance/15 text-finance-text',
  },
  {
    icon: ListTodo,
    title: 'Tugas & To-Do',
    desc: 'Kelola tugas harian, buat kebiasaan, capai target.',
    tint: 'bg-todo/10 text-todo-text',
  },
];

const METRICS = [
  { icon: Users, value: 10, suffix: 'K+', label: 'Pengguna Aktif' },
  { icon: NotebookPen, value: 1, suffix: 'M+', label: 'Catatan Tersimpan' },
  { icon: Heart, value: 99.9, suffix: '%', label: 'Waktu Aktif', decimals: 1 },
  { icon: ShieldCheck, value: 100, suffix: '%', label: 'Privat Terjamin' },
];

const FAQS = [
  { q: 'Apa itu TemanNyatet?', a: 'Aplikasi all-in-one untuk catatan, keuangan, to-do, dan link saver — data aman di cloud, bisa diakses dari HP maupun laptop.' },
  { q: 'Apakah data saya aman?', a: 'Ya. Data disimpan di database PostgreSQL terkelola dengan koneksi terenkripsi dan autentikasi aman.' },
  { q: 'Bagaimana fitur Voice bekerja?', a: 'Tekan dan tahan tombol mic, lalu bicara. Rekaman ditranskripsi otomatis menjadi catatan teks.' },
  { q: 'Bisakah berhenti berlangganan kapan saja?', a: 'Tentu. Berhenti kapan pun tanpa syarat; semua data tetap bisa diakses.' },
];

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
};

/* ────────────────────────────────────────────────────────────────
   SCROLL-TRIGGERED REVEALS (subtle, once)
   ──────────────────────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-60px 0px' });
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay }}
    >
      {children}
    </motion.div>
  );
}

function StaggerParent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px 0px' });
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: reduced ? 0 : 0.08 } } }}
    >
      {children}
    </motion.div>
  );
}

const staggerItem = {
  hidden: { opacity: 0, y: 18, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...SPRING_SMOOTH } },
};

function WordReveal({ text, highlightFrom = -1, className = '' }: { text: string; highlightFrom?: number; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const lines = text.split('\n');
  let wordIndex = 0;
  return (
    <motion.h1
      className={className}
      style={{ perspective: 800 }}
      initial={reduced ? { opacity: 1 } : 'hidden'}
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: reduced ? 0 : 0.06 } } }}
    >
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(' ').map((word) => {
            const i = wordIndex++;
            return (
              <motion.span
                key={`${li}-${i}`}
                className={`mr-[0.25em] inline-block${highlightFrom >= 0 && i >= highlightFrom ? ' text-primary' : ''}`}
                variants={{
                  hidden: reduced ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 16, rotateX: -12 },
                  visible: { opacity: 1, y: 0, rotateX: 0, transition: SPRING_SMOOTH },
                }}
              >
                {word}
              </motion.span>
            );
          })}
        </span>
      ))}
    </motion.h1>
  );
}

/* ────────────────────────────────────────────────────────────────
   STATS COUNT-UP
   ──────────────────────────────────────────────────────────────── */
function CountUp({ target, suffix = '', decimals = 0 }: { target: number; suffix?: string; decimals?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      setCount(target);
      return;
    }
    const duration = 1400;
    const steps = 50;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(current);
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target, reduced]);

  const formatted = count.toLocaleString(decimals > 0 ? 'en-US' : 'id-ID', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return (
    <span ref={ref}>
      {formatted}
      {suffix}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
   FAQ ACCORDION
   ──────────────────────────────────────────────────────────────── */
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  const reduced = usePrefersReducedMotion();
  return (
    <motion.div layout className="border-b border-border/70">
      <motion.button
        layout
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 rounded-lg py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
      >
        <span className="text-sm font-semibold text-foreground sm:text-base">{question}</span>
        <motion.span
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base leading-none text-primary"
          animate={{ rotate: open ? 45 : 0 }}
          transition={reduced ? { duration: 0 } : SPRING_SNAPPY}
        >
          +
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={reduced ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduced ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ height: reduced ? { duration: 0 } : SPRING_SMOOTH, opacity: { duration: 0.2 } }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm leading-relaxed text-muted-foreground">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   LANDING PAGE
   ──────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [location, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'login' | 'register'>('login');
  const reduced = usePrefersReducedMotion();

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

  /* Hero parallax + mockup tilt (spring) */
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -80]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [5, -5]), SPRING_SMOOTH);
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), SPRING_SMOOTH);

  const onHeroMove = (e: React.MouseEvent<HTMLElement>) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  return (
    <div className="min-h-dvh bg-background">
      {/* ── NAVBAR — sticky glass ─────────────────────────────────────── */}
      <header className="app-page-header">
        <div className="app-page-header-inner">
          <a
            href="#top"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-elevation-1">
              <Sparkles size={17} className="text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
              temanNyatet
            </span>
          </a>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => scrollTo(link.id)}
                className="min-h-11 cursor-pointer rounded-xl px-3.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => openAuth('login')} className="rounded-full">
              Masuk
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => openAuth('register')}
              className="hidden rounded-full sm:inline-flex"
            >
              Daftar Gratis
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={() => openAuth('register')}
              className="sm:hidden"
              aria-label="Daftar Gratis"
            >
              <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ── HERO — left copy + right phone mockup ────────────────────── */}
        <section id="hero" onMouseMove={onHeroMove} className="relative isolate overflow-hidden">
          {/* Ambient background: dots (left) + soft cream gradient (right/bottom) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-20 top-16 h-72 w-72 opacity-70 dark:opacity-30"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(25, 118, 99, 0.14) 1.5px, transparent 1.5px)',
              backgroundSize: '22px 22px',
              maskImage: 'radial-gradient(circle at 40% 40%, black, transparent 75%)',
              WebkitMaskImage: 'radial-gradient(circle at 40% 40%, black, transparent 75%)',
            }}
          />


          <div className="relative mx-auto grid w-full max-w-screen-xl items-center gap-10 px-5 pb-14 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-2 lg:gap-12 lg:px-10 lg:pb-20 lg:pt-20">
            {/* Copy */}
            <motion.div className="max-w-xl" style={reduced ? undefined : { y: heroY, opacity: heroOpacity }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5">
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary">
                  Aplikasi catatan & keuangan all-in-one
                </span>
              </div>

              <WordReveal
                text="Catat semuanya,\nKelola lebih mudah"
                highlightFrom={2}
                className="text-display mt-4 text-[calc(2.4rem*var(--text-scale))] sm:text-[calc(3rem*var(--text-scale))] lg:text-[calc(3.4rem*var(--text-scale))]"
              />

              <motion.p
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay: 0.3 }}
                className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground"
              >
                Catatan, keuangan, link, dan tugas dalam satu aplikasi. Dilengkapi
                AI summarize & voice note untuk produktivitas tanpa batas.
              </motion.p>

              <motion.div
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay: 0.4 }}
                className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <Button
                  type="button"
                  size="lg"
                  onClick={() => openAuth('register')}
                  className="w-full rounded-full sm:w-auto"
                >
                  Daftar Gratis
                </Button>
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  onClick={() => scrollTo('fitur')}
                  className="w-full rounded-full sm:w-auto"
                >
                  <CirclePlay size={18} className="text-primary" />
                  Lihat Demo
                </Button>
              </motion.div>

              {/* Mini feature grid — AI Summarize · Voice Note · Aman & Privat */}
              <motion.div
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay: 0.5 }}
                className="mt-9 grid gap-x-6 gap-y-5 sm:grid-cols-3"
              >
                {HERO_FEATURES.map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <feature.icon size={18} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{feature.title}</p>
                      <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{feature.desc}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Phone mockup — slight static angle + tilt mengikuti mouse */}
            <motion.div
              aria-hidden="true"
              className="relative mx-auto w-full max-w-[19rem] will-change-transform lg:max-w-none"
              style={reduced ? undefined : { rotateX: rotX, rotateY: rotY, transformPerspective: 1200 }}
              initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }}
              animate={{ opacity: 1, y: 0 }}
              transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay: 0.2 }}
            >
              <div className="lg:rotate-2">
                <PhoneMockup />
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── SOCIAL PROOF — trusted metrics banner ────────────────────── */}
        <section id="keamanan" className="mx-auto w-full max-w-screen-xl scroll-mt-24 px-5 sm:px-6 lg:px-10">
          <FadeUp>
            <div className="rounded-[1.75rem] border border-card-border bg-card px-6 py-8 shadow-elevation-1 sm:px-10 sm:py-10">
              <p className="text-center text-sm font-medium text-muted-foreground">
                Dipercaya oleh pengguna untuk produktivitas harian
              </p>
              <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-4">
                {METRICS.map((metric) => (
                  <div key={metric.label} className="flex flex-col items-center gap-2 text-center">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <metric.icon size={18} />
                    </span>
                    <p className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground sm:text-2xl">
                      <CountUp target={metric.value} suffix={metric.suffix} decimals={metric.decimals} />
                    </p>
                    <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </FadeUp>
        </section>

        {/* ── FEATURES — 4 cards ───────────────────────────────────────── */}
        <section id="fitur" className="mx-auto w-full max-w-screen-xl scroll-mt-24 px-5 py-14 sm:px-6 lg:px-10 lg:py-20">
          <FadeUp>
            <h2 className="text-page-title">
              Semua yang kamu butuhkan
              <br />
              dalam <span className="text-primary">satu aplikasi</span>
            </h2>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
              Dirancang untuk membantumu fokus pada hal penting dengan fitur yang lengkap dan mudah digunakan.
            </p>
          </FadeUp>

          <StaggerParent className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                whileHover={reduced ? undefined : { y: -4 }}
                transition={reduced ? { duration: 0 } : SPRING_SNAPPY}
                className="[@media(hover:none)]:transform-none group rounded-2xl border border-card-border bg-card p-5 shadow-elevation-1 transition-shadow duration-200 hover:shadow-elevation-2 sm:p-6"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${feature.tint} transition-transform duration-200 group-hover:scale-105`}>
                  <feature.icon size={19} />
                </span>
                <h3 className="text-section-title mt-4">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </StaggerParent>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <section id="faq" className="mx-auto w-full max-w-2xl scroll-mt-24 px-5 py-14 sm:px-6 lg:py-20">
          <FadeUp className="mb-6 text-center">
            <p className="text-pill-label">FAQ</p>
            <h2 className="text-page-title mt-1">Masih ragu?</h2>
          </FadeUp>
          <FadeUp delay={0.1}>
            {FAQS.map((f) => (
              <FAQItem key={f.q} question={f.q} answer={f.a} />
            ))}
          </FadeUp>
        </section>

        {/* ── CTA FINAL — mint band ────────────────────────────────────── */}
        <section id="harga" className="mx-auto w-full max-w-screen-xl scroll-mt-24 px-5 pb-16 sm:px-6 lg:px-10 lg:pb-20">
          <FadeUp>
            <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#e6f6ef] via-[#f0f8f4] to-[#fbf1e2] px-6 py-10 shadow-elevation-1 dark:from-[#0e2a22] dark:via-[#123229] dark:to-[#1a3329] sm:px-10 sm:py-12">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/30 blur-2xl dark:bg-white/5"
              />
              <div className="relative flex flex-col items-center gap-8 lg:flex-row lg:justify-between lg:gap-12">
                {/* Notepad graphic + confetti */}
                <div aria-hidden="true" className="relative hidden h-28 w-28 shrink-0 sm:block">
                  <div className="absolute left-0 top-1 h-24 w-[4.5rem] -rotate-6 rounded-xl bg-card p-3 shadow-elevation-2">
                    <span className="block h-1 w-8 rounded-full bg-primary/40" />
                    <span className="mt-1.5 block h-1 w-10 rounded-full bg-primary/30" />
                    <span className="mt-1.5 block h-1 w-7 rounded-full bg-primary/20" />
                  </div>
                  <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevation-2">
                    <Check size={16} />
                  </span>
                  <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-linksaver" />
                  <span className="absolute right-1 top-0 h-2 w-2 rounded-full bg-finance" />
                  <span className="absolute bottom-4 -right-2 h-2 w-2 rounded-full bg-todo" />
                  <span className="absolute -bottom-1 left-6 h-2 w-2 rounded-full bg-primary/60" />
                </div>

                <div className="max-w-lg text-center lg:text-left">
                  <h2 className="font-display text-[calc(1.6rem*var(--text-scale))] font-semibold leading-tight tracking-[-0.03em] text-foreground sm:text-[calc(1.9rem*var(--text-scale))]">
                    Mulai produktif hari ini 🚀
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Bergabung gratis dan rasakan kemudahan mencatat semua hal penting dalam hidupmu.
                  </p>
                </div>

                <Button
                  type="button"
                  size="lg"
                  onClick={() => openAuth('register')}
                  className="w-full shrink-0 rounded-full shadow-elevation-2 sm:w-auto"
                >
                  Daftar Gratis Sekarang
                </Button>
              </div>
            </div>
          </FadeUp>
        </section>
      </main>

      {/* ── FOOTER — single row ────────────────────────────────────────── */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex w-full max-w-screen-xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row sm:px-6 lg:px-10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles size={15} className="text-primary-foreground" />
            </span>
            <span className="font-display text-sm font-semibold text-foreground">temanNyatet</span>
          </div>

          <nav aria-label="Tautan footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/terms-of-service" className="min-h-9 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="min-h-9 rounded-lg px-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy Policy
            </Link>
          </nav>

          <p className="text-xs text-muted-foreground">© 2026 temanNyatet</p>
        </div>
      </footer>

      {/* ── Integrated auth dialog ─────────────────────────────────────── */}
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
  const reduced = usePrefersReducedMotion();

  return (
    <div className="relative">
      {/* Floating voice-note notification (top-left, outside device) */}
      <motion.div
        className="absolute -left-4 top-12 z-20 hidden w-max items-center gap-2.5 rounded-2xl border border-card-border bg-card p-3 pr-3.5 shadow-elevation-2 sm:flex lg:-left-12"
        initial={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 12, scale: 0.96 }}
        animate={reduced ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: [0, -7, 0], scale: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                opacity: { duration: 0.45, delay: 0.6 },
                scale: { duration: 0.45, delay: 0.6 },
                y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
              }
        }
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Mic size={14} />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-foreground">"belanja mingguan 150rb"</p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-income">
            <Check size={11} className="shrink-0" />
            Tercatat sebagai pengeluaran
          </p>
        </div>
        <span className="ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-[10px] font-bold text-primary">
          R
        </span>
      </motion.div>

      {/* Floating activity status (bottom-left, outside device) */}
      <motion.div
        className="absolute -left-3 bottom-28 z-20 hidden items-center gap-2.5 rounded-2xl border border-card-border bg-card px-3.5 py-2.5 shadow-elevation-2 sm:flex lg:-left-10"
        animate={reduced ? undefined : { y: [0, 7, 0] }}
        transition={reduced ? { duration: 0 } : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles size={13} />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-income ring-2 ring-card" />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-foreground">Ringkasan AI siap</p>
          <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">Keuangan • Bulan ini</p>
        </div>
      </motion.div>

      {/* Device frame */}
      <div className="relative mx-auto w-[17.5rem] rounded-[2.9rem] border border-border/70 bg-background p-2 shadow-elevated">
        <div className="relative overflow-hidden rounded-[2.35rem] border border-border/50 bg-card">
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pb-1.5 pt-3">
            <span className="text-[11px] font-semibold text-foreground">9:41</span>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Signal size={12} strokeWidth={2.2} />
              <Wifi size={12} strokeWidth={2.2} />
              <Battery size={14} strokeWidth={2} />
            </div>
          </div>

          {/* Header: status dots + avatar (match app screenshot) */}
          <div className="flex items-center justify-end px-4 pb-1.5">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="h-1.5 w-1.5 rounded-full bg-finance" />
                <span className="h-1.5 w-1.5 rounded-full bg-todo" />
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-primary/50 bg-card text-[10px] font-bold text-primary">
                R
              </span>
            </div>
          </div>

          {/* Voice-note bubble overlapping the balance card */}
          <motion.div
            className="absolute left-3 top-[4.15rem] z-10 flex items-center gap-2 rounded-xl border border-card-border bg-card py-1.5 pl-1.5 pr-2.5 shadow-elevation-2"
            initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay: 0.9 }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Mic size={11} />
            </span>
            <div className="leading-tight">
              <p className="text-[10px] font-semibold text-foreground">"belanja mingguan 150rb"</p>
              <p className="flex items-center gap-0.5 text-[9px] font-medium text-income">
                Tercatat sebagai pengeluaran
                <Check size={9} className="shrink-0" />
              </p>
            </div>
          </motion.div>

          {/* Balance card — the hero element of the screen */}
          <div
            className="relative mx-4 mt-2.5 overflow-hidden rounded-2xl px-4 pb-3.5 pt-3 text-primary-foreground shadow-elevation-1"
            style={{ background: 'linear-gradient(135deg, #1f9b77 0%, #14705a 55%, #0d5644 100%)' }}
          >
            <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-12 h-28 w-28 rounded-full bg-white/10 blur-xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-14 -left-8 h-32 w-32 rounded-full bg-white/5 blur-xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-5 right-9 h-16 w-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-medium text-primary-foreground/80">Saldo bulan ini</p>
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold">
                  <Eye size={10} />
                  Lihat detail
                </span>
              </div>
              <p className="font-display mt-1 text-[1.35rem] font-semibold tracking-[-0.02em]">Rp 4.820.500</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-2 py-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <ArrowUpRight size={10} />
                  </span>
                  <div className="leading-tight">
                    <p className="text-[8px] font-medium text-primary-foreground/70">Pemasukan</p>
                    <p className="text-[10px] font-bold">+ Rp 2.400.000</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 rounded-xl bg-white/15 px-2 py-1.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20">
                    <ArrowDownRight size={10} />
                  </span>
                  <div className="leading-tight">
                    <p className="text-[8px] font-medium text-primary-foreground/70">Pengeluaran</p>
                    <p className="text-[10px] font-bold">− Rp 1.275.000</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes + task progress */}
          <div className="space-y-2 px-4 pb-3 pt-3.5">
            <div className="flex items-center justify-between px-0.5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">Catatan</p>
              <span className="flex items-center gap-0.5 text-[10px] font-medium text-muted-foreground">
                Lihat semua
                <ChevronRight size={11} />
              </span>
            </div>

            <div
              className="flex items-center gap-2.5 rounded-xl border p-2.5"
              style={{ backgroundColor: 'var(--note-card-1)', borderColor: 'var(--note-card-1-border)', color: 'var(--note-card-1-foreground)' }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-finance text-white">
                <Lightbulb size={13} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[11px] font-semibold">Ide aplikasi baru 💡</p>
                <p className="mt-0.5 text-[9px] opacity-70">Voice note • 2 menit lalu</p>
              </div>
              <MoreVertical size={12} className="shrink-0 opacity-40" />
            </div>

            <div
              className="flex items-center gap-2.5 rounded-xl border p-2.5"
              style={{ backgroundColor: 'var(--note-card-2)', borderColor: 'var(--note-card-2-border)', color: 'var(--note-card-2-foreground)' }}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShoppingCart size={13} />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[11px] font-semibold">Belanja mingguan 🛒</p>
                <p className="mt-0.5 text-[9px] opacity-70">Keuangan • Kemarin</p>
              </div>
              <MoreVertical size={12} className="shrink-0 opacity-40" />
            </div>

            {/* Task progress */}
            <div className="rounded-xl border border-border/60 bg-surface/80 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-[11px] font-semibold text-foreground">Beres-beres kamar</p>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-income/12 px-1.5 py-0.5">
                  <Check size={9} className="rounded-full bg-income p-px text-white" />
                  <span className="text-[9px] font-bold text-income">3 dari 5 tugas beres</span>
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: reduced ? '60%' : '0%' }}
                    animate={{ width: '60%' }}
                    transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay: 0.7 }}
                  />
                </div>
                <span className="text-[9px] font-semibold text-muted-foreground">60%</span>
              </div>
            </div>
          </div>

          {/* Bottom navigation with center FAB */}
          <div className="px-4 pb-4 pt-6">
            <div className="relative flex items-center justify-between rounded-2xl border border-border/60 bg-background px-3 pb-2 pt-2.5 shadow-elevation-1">
              <span className="flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-xl bg-primary/10 text-primary">
                <Home size={14} />
                <span className="text-[7px] font-bold">Beranda</span>
              </span>
              <span className="flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-xl text-muted-foreground">
                <StickyNote size={14} />
                <span className="text-[7px] font-medium">Catatan</span>
              </span>
              <span className="absolute left-1/2 top-0 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-elevation-2">
                <Plus size={16} />
              </span>
              <span className="flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-xl text-muted-foreground">
                <ListTodo size={14} />
                <span className="text-[7px] font-medium">Tugas</span>
              </span>
              <span className="flex h-9 w-9 flex-col items-center justify-center gap-0.5 rounded-xl text-muted-foreground">
                <User size={14} />
                <span className="text-[7px] font-medium">Akun</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
