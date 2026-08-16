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
  ArrowRight,
  BookOpen,
  Check,
  ListTodo,
  Mic,
  ShieldCheck,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AuthDialog from '@/components/AuthDialog';
import { prefersReducedMotion, usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { getPriceLabel } from '@/lib/pricing';

/* ────────────────────────────────────────────────────────────────
   SPRING CONFIG
   ──────────────────────────────────────────────────────────────── */
const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 } as const;
const SPRING_SMOOTH = { type: 'spring', stiffness: 200, damping: 28, mass: 1.0 } as const;
const SPRING_BOUNCY = { type: 'spring', stiffness: 500, damping: 20, mass: 0.6 } as const;

const NAV_LINKS = [
  { id: 'fitur', label: 'Fitur' },
  { id: 'cara-kerja', label: 'Cara Kerja' },
  { id: 'harga', label: 'Harga' },
  { id: 'faq', label: 'FAQ' },
];

const FEATURES = [
  {
    icon: Mic,
    title: 'Catatan + Voice',
    desc: 'Ketik atau langsung bicara — transkripsi otomatis tanpa mengetik.',
    tint: 'bg-primary/10 text-primary',
  },
  {
    icon: Wallet,
    title: 'Keuangan Terpantau',
    desc: 'Catat pemasukan & pengeluaran, ringkasan AI tiap bulan.',
    tint: 'bg-finance/12 text-finance-text',
  },
  {
    icon: ListTodo,
    title: 'To-Do & Link Saver',
    desc: 'Tugas beres satu per satu, link favorit tersimpan rapi.',
    tint: 'bg-todo/10 text-todo-text',
  },
];

const STEPS = [
  { title: 'Buat akun gratis', desc: 'Daftar dengan email, tanpa kartu kredit.' },
  { title: 'Catat apa saja', desc: 'Note, uang, tugas, atau link — sekali ketuk.' },
  { title: 'Pantau & beres', desc: 'Ringkasan AI dan sinkron cloud bikin semua otomatis.' },
];

const TESTIMONIALS = [
  { name: 'Rani P.', role: 'Mahasiswa, Bandung', quote: 'Fitur voice-nya juara. Ide langsung masuk tanpa ngetik.' },
  { name: 'Dimas A.', role: 'Freelancer, Jakarta', quote: 'Keuangan akhirnya rapi. AI-nya nunjukin pola belanja.' },
  { name: 'Sari W.', role: 'Ibu rumah tangga, Yogyakarta', quote: 'Semua di satu tempat. Simpel dan nyaman di HP.' },
];

const PRICING = {
  free: {
    name: 'Free',
    price: 0,
    yearly: 0,
    tagline: 'Mulai merapikan hidup.',
    features: ['Catatan & to-do tanpa batas', 'Arsip 30 hari', '1 perangkat'],
  },
  pro: {
    name: 'Pro',
    price: 100_000,
    yearly: 249_000,
    tagline: 'Serius beres-beres.',
    features: ['Voice transcription tanpa batas', 'Ringkasan AI keuangan', 'Keuangan & Link Saver lengkap', 'Sinkron semua perangkat'],
  },
};

const FAQS = [
  { q: 'Apa itu TemanNyatet?', a: 'Aplikasi all-in-one untuk catatan, keuangan, to-do, dan link saver — data aman di cloud, bisa diakses dari HP maupun laptop.' },
  { q: 'Apakah data saya aman?', a: 'Ya. Data disimpan di database PostgreSQL terkelola dengan koneksi terenkripsi dan autentikasi aman.' },
  { q: 'Bagaimana fitur Voice bekerja?', a: 'Tekan dan tahan tombol mic, lalu bicara. Rekaman ditranskripsi otomatis menjadi catatan teks.' },
  { q: 'Bisakah berhenti berlangganan kapan saja?', a: 'Tentu. Berhenti kapan pun tanpa syarat; semua data tetap bisa diakses.' },
];

const STATS = [
  { v: 12000, suffix: '+', label: 'Pengguna' },
  { v: 240000, suffix: '+', label: 'Catatan' },
  { v: 49, label: 'Rating pengguna', decimals: true },
];

const TRUST_POINTS = ['Gratis untuk memulai', 'Tanpa kartu kredit', 'Data tetap milikmu'];

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

function WordReveal({ text, className = '' }: { text: string; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const words = text.split(' ');
  return (
    <motion.h1
      className={className}
      style={{ perspective: 800 }}
      initial={reduced ? { opacity: 1 } : 'hidden'}
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: reduced ? 0 : 0.06 } } }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="mr-[0.25em] inline-block"
          variants={{
            hidden: reduced ? { opacity: 1, y: 0, rotateX: 0 } : { opacity: 0, y: 16, rotateX: -12 },
            visible: { opacity: 1, y: 0, rotateX: 0, transition: SPRING_SMOOTH },
          }}
        >
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
}

/* ────────────────────────────────────────────────────────────────
   STATS COUNT-UP
   ──────────────────────────────────────────────────────────────── */
function CountUp({ target, suffix = '' }: { target: number; suffix?: string }) {
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
      setCount(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target, reduced]);

  return (
    <span ref={ref}>
      {count.toLocaleString('id-ID')}
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
  const [annual, setAnnual] = useState(false);
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
              <BookOpen size={17} className="text-primary-foreground" />
            </span>
            <span className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground">
              TemanNyatet
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
            <Button type="button" variant="ghost" size="sm" onClick={() => openAuth('login')}>
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
        {/* ── HERO — value prop + CTA + stats ──────────────────────────── */}
        <section id="hero" onMouseMove={onHeroMove} className="relative isolate overflow-hidden">
          {/* Warm background shapes */}
          <div aria-hidden="true" className="pointer-events-none absolute -left-32 top-[-6rem] h-96 w-96 rotate-[-18deg] rounded-[38%_62%_55%_45%] bg-primary/8 sm:h-[28rem] sm:w-[28rem]" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-40 top-40 h-[26rem] w-[26rem] rotate-[22deg] rounded-[58%_42%_44%_56%] bg-finance/10 sm:h-[30rem] sm:w-[30rem]" />

          <div className="relative mx-auto grid w-full max-w-screen-xl items-center gap-10 px-5 pb-14 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-2 lg:gap-12 lg:px-10 lg:pb-20 lg:pt-20">
            {/* Copy */}
            <motion.div className="max-w-xl" style={reduced ? undefined : { y: heroY, opacity: heroOpacity }}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-3.5 py-1.5">
                <Sparkles size={14} className="text-primary" />
                <span className="text-xs font-semibold text-primary">
                  Catatan + Keuangan + To-Do, satu aplikasi
                </span>
              </div>

              <WordReveal
                text="Catat sat-set, urusan beres."
                className="text-display mt-4 text-[calc(2.4rem*var(--text-scale))] sm:text-[calc(3rem*var(--text-scale))] lg:text-[calc(3.4rem*var(--text-scale))]"
              />

              <motion.p
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay: 0.3 }}
                className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground"
              >
                Catatan, keuangan, to-do, dan link — semua di satu tempat. Ketik atau
                langsung bicara, TemanNyatet yang merapikan.
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
              </motion.div>

              {/* Trust points */}
              <motion.ul
                initial={reduced ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay: 0.5 }}
                className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2"
              >
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Check size={14} className="text-income" />
                    {point}
                  </li>
                ))}
              </motion.ul>

              {/* Social proof — compact inline stats */}
              <motion.div
                initial={reduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reduced ? { duration: 0 } : { ...SPRING_SMOOTH, delay: 0.55 }}
                className="mt-7 flex items-center gap-6 border-t border-border/60 pt-5 sm:gap-8"
              >
                {STATS.map((stat, i) => (
                  <div key={stat.label} className={i > 0 ? 'border-l border-border/60 pl-6 sm:pl-8' : ''}>
                    <p className="font-display text-lg font-semibold tracking-[-0.02em] text-foreground sm:text-xl">
                      {stat.decimals ? (
                        <>
                          <CountUp target={stat.v} suffix="," />9<span className="text-primary">★</span>
                        </>
                      ) : (
                        <CountUp target={stat.v} suffix={stat.suffix} />
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </motion.div>
            </motion.div>

            {/* Phone mockup — tilt halus mengikuti mouse */}
            <motion.div
              aria-hidden="true"
              className="relative mx-auto w-full max-w-[19rem] will-change-transform lg:max-w-none"
              style={reduced ? undefined : { rotateX: rotX, rotateY: rotY, transformPerspective: 1200 }}
            >
              <PhoneMockup />
            </motion.div>
          </div>
        </section>

        {/* ── FEATURES ─────────────────────────────────────────────────── */}
        <section id="fitur" className="mx-auto w-full max-w-screen-xl scroll-mt-24 px-5 py-14 sm:px-6 lg:px-10 lg:py-20">
          <FadeUp className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-pill-label">Fitur</p>
              <h2 className="text-page-title mt-1">Semua yang kamu butuhin, satu tempat</h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Empat alat dalam satu aplikasi — dirancang agar mencatat terasa ringan.
            </p>
          </FadeUp>

          <StaggerParent className="mt-8 grid gap-3 sm:grid-cols-3">
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

        {/* ── HOW IT WORKS — slim strip ────────────────────────────────── */}
        <section id="cara-kerja" className="mx-auto w-full max-w-screen-xl scroll-mt-24 px-5 py-14 sm:px-6 lg:px-10 lg:py-20">
          <FadeUp className="text-center">
            <p className="text-pill-label">Cara Kerja</p>
            <h2 className="text-page-title mt-1">Beres dalam 3 langkah</h2>
          </FadeUp>

          <StaggerParent className="mx-auto mt-8 grid max-w-3xl gap-8 sm:grid-cols-3 sm:gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                variants={staggerItem}
                className="relative flex items-start gap-4 sm:block sm:text-center"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary">
                  {i + 1}
                </span>
                <div className="sm:mt-3">
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </StaggerParent>
        </section>

        {/* ── TESTIMONIAL ──────────────────────────────────────────────── */}
        <section id="testimoni" className="mx-auto w-full max-w-screen-xl scroll-mt-24 px-5 py-14 sm:px-6 lg:px-10 lg:py-20">
          <FadeUp className="text-center">
            <p className="text-pill-label">Testimoni</p>
            <h2 className="text-page-title mt-1">Kata mereka yang sudah beres</h2>
          </FadeUp>

          <StaggerParent className="mt-8 grid gap-3 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <motion.figure
                key={t.name}
                variants={staggerItem}
                className="flex flex-col rounded-2xl border border-card-border bg-card p-5 shadow-elevation-1 sm:p-6"
              >
                <div className="mb-3 flex gap-0.5 text-finance" aria-label="5 dari 5 bintang">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} className="fill-current" />
                  ))}
                </div>
                <blockquote className="flex-1 text-sm leading-relaxed text-foreground/90">
                  “{t.quote}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {t.name[0]}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-foreground">{t.name}</span>
                    <span className="block text-xs text-muted-foreground">{t.role}</span>
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </StaggerParent>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────── */}
        <section id="harga" className="mx-auto w-full max-w-4xl scroll-mt-24 px-5 py-14 sm:px-6 lg:py-20">
          <FadeUp className="text-center">
            <p className="text-pill-label">Harga</p>
            <h2 className="text-page-title mt-1">Mulai gratis, upgrade kapan pun</h2>
          </FadeUp>

          <FadeUp delay={0.1} className="mt-7 flex justify-center">
            <div className="flex items-center gap-3 rounded-full border border-card-border bg-card px-5 py-2.5 shadow-elevation-1">
              <span className={`text-sm font-semibold ${!annual ? 'text-primary' : 'text-muted-foreground'}`}>
                Bulanan
              </span>
              <motion.button
                type="button"
                onClick={() => setAnnual(!annual)}
                role="switch"
                aria-checked={annual}
                aria-label="Beralih billing tahunan"
                className={`relative h-8 w-14 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${annual ? 'bg-primary' : 'bg-muted'}`}
              >
                <motion.span
                  className="absolute left-1 top-1 h-6 w-6 rounded-full bg-card shadow-elevation-1"
                  animate={{ x: annual ? 28 : 0 }}
                  transition={reduced ? { duration: 0 } : SPRING_BOUNCY}
                />
              </motion.button>
              <span className={`text-sm font-semibold ${annual ? 'text-primary' : 'text-muted-foreground'}`}>
                Tahunan{' '}
                <em className="ml-1 rounded-full bg-finance/15 px-2 py-0.5 text-xs not-italic font-bold text-finance-text">
                  Hemat 79%
                </em>
              </span>
            </div>
          </FadeUp>

          <StaggerParent className="mx-auto mt-8 grid max-w-2xl gap-3 sm:grid-cols-2">
            {[PRICING.free, PRICING.pro].map((tier) => {
              const isPro = tier.name === 'Pro';
              const { amount: priceAmount, period: pricePeriod } = getPriceLabel({
                isPro,
                price: tier.price,
                yearly: tier.yearly,
                annual,
              });
              return (
                <motion.div
                  key={tier.name}
                  variants={staggerItem}
                  className={`relative rounded-[1.5rem] p-6 ${
                    isPro
                      ? 'bg-primary text-primary-foreground shadow-elevation-2'
                      : 'border border-card-border bg-card text-foreground shadow-elevation-1'
                  }`}
                >
                  {isPro && (
                    <span className="absolute right-4 top-4 rounded-full bg-finance px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-finance-text">
                      Populer
                    </span>
                  )}
                  <h3 className="font-display text-base font-semibold tracking-[-0.02em]">{tier.name}</h3>
                  <p className={`mt-0.5 text-xs ${isPro ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
                    {tier.tagline}
                  </p>

                  <div className="mt-4 flex items-end gap-1.5 overflow-hidden">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={`${tier.name}-${annual}`}
                        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -12 }}
                        transition={reduced ? { duration: 0 } : SPRING_SNAPPY}
                        className="font-display text-2xl font-semibold tracking-[-0.03em]"
                      >
                        {priceAmount}
                      </motion.span>
                    </AnimatePresence>
                    <span className={`pb-0.5 text-xs ${isPro ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                      {pricePeriod}
                    </span>
                  </div>

                  <ul className="mt-5 space-y-2.5">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check
                          size={15}
                          className={`mt-0.5 shrink-0 ${isPro ? 'text-primary-foreground' : 'text-income'}`}
                        />
                        <span className={isPro ? 'text-primary-foreground/90' : 'text-muted-foreground'}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    type="button"
                    size="lg"
                    onClick={() => openAuth('register')}
                    style={isPro ? { backgroundColor: 'var(--card)', color: 'var(--card-foreground)', borderColor: 'var(--card-border)' } : undefined}
                    className={`mt-6 w-full rounded-xl ${isPro ? 'shadow-elevation-1 hover:opacity-90' : ''}`}
                  >
                    {isPro ? 'Upgrade ke Pro' : 'Mulai Gratis'}
                  </Button>
                </motion.div>
              );
            })}
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

        {/* ── CTA FINAL — compact band ─────────────────────────────────── */}
        <section className="mx-auto w-full max-w-screen-xl px-5 pb-16 sm:px-6 lg:px-10 lg:pb-20">
          <FadeUp>
            <div className="relative isolate overflow-hidden rounded-[1.75rem] bg-primary px-6 py-10 text-center shadow-elevation-2 sm:py-12">
              <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-black/10 blur-2xl" />

              <div className="relative">
                <h2 className="font-display text-[calc(1.6rem*var(--text-scale))] font-semibold leading-tight tracking-[-0.03em] text-primary-foreground sm:text-[calc(2rem*var(--text-scale))]">
                  Siap beres-beres catatanmu?
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-primary-foreground/80">
                  Gabung gratis dan mulai mencatat sat-set — dari HP atau desktop.
                </p>
                <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => openAuth('register')}
                    style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)', borderColor: 'var(--card-border)' }}
                    className="w-full rounded-xl shadow-elevation-2 hover:opacity-90 sm:w-auto"
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
                <p className="mt-5 flex items-center justify-center gap-1.5 text-xs font-medium text-primary-foreground/70">
                  <ShieldCheck size={14} />
                  Data kamu tetap aman dan milikmu.
                </p>
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
              <BookOpen size={15} className="text-primary-foreground" />
            </span>
            <span className="font-display text-sm font-semibold text-foreground">TemanNyatet</span>
          </div>

          <nav aria-label="Tautan footer" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
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
      <div className="relative mx-auto w-[17rem] rounded-[2.75rem] border border-border/70 bg-background p-2.5 shadow-elevated">
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
