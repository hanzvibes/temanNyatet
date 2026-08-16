/*
 * ⚠️ REFERENCE-ONLY ARTIFACT — tidak di-import oleh aplikasi.
 * Desain yang sama sudah hidup di src/pages/LandingPage.tsx (terintegrasi auth
 * + design system). File ini standalone (React + Tailwind + framer-motion)
 * untuk direferensikan / disalin. Sintaks Tailwind ditulis untuk v4
 * (important = suffix, mis. `px-5!`).
 */
import React, { useRef, useState, useEffect } from 'react';
import {
  motion, AnimatePresence,
  useScroll, useTransform, useSpring,
  useMotionValue, useInView,
} from 'framer-motion';

/* ────────────────────────────────────────────────────────────────
   KONTEN PRODUK — isi di sini
   Catatan: warna dipakai langsung di class Tailwind sebagai arbitrary
   value statis (mis. bg-[#197663]) karena Tailwind JIT hanya
   mengenali kelas yang tertulis lengkap di sumber.
   ──────────────────────────────────────────────────────────────── */
const PRODUCT = 'TemanNyatet';
const TAGLINE = 'Catat sat-set, urusan langsung beres';
const SUB_TAGLINE =
  'Catatan, keuangan, to-do, dan link favorit — semua menyatu di satu aplikasi yang ringan dan nyaman dipakai di HP. Data aman di cloud, tersinkron di semua perangkat.';
/* Warna brand: PRIMARY = sage teal #197663, ACCENT = amber #F59E0B */
const CTA_TEXT = 'Mulai Gratis';

const FEATURES = [
  {
    title: 'Catatan + Voice',
    desc: 'Ketuk tombol mic dan bicara — catatan langsung tersimpan rapi. Press-and-hold untuk merekam, transkripsi otomatis tanpa mengetik.',
    icon: 'mic',
  },
  {
    title: 'Keuangan Terpantau',
    desc: 'Catat pemasukan & pengeluaran sekali sentuh. Ringkasan AI memotret pola belanjamu tiap bulan, jadi nggak ada uang yang hilang tanpa jejak.',
    icon: 'wallet',
  },
  {
    title: 'To-Do & Link Saver',
    desc: 'Tugas harian beres satu per satu, plus link favorit tersimpan rapi — nggak hilang lagi di tengah chat atau tab yang keburu ketutup.',
    icon: 'check',
  },
];

const STEPS = [
  { title: 'Buat akun gratis', desc: 'Daftar dengan email dalam 30 detik. Tanpa kartu kredit, tanpa ribet.' },
  { title: 'Catat apa saja', desc: 'Note, uang keluar-masuk, tugas, atau link — cukup ketuk tombol + di bawah layar.' },
  { title: 'Pantau & beres', desc: 'Ringkasan AI, arsip otomatis, dan sinkron cloud bikin semua urusan beres sendiri.' },
];

const TESTIMONIALS = [
  { name: 'Rani P.', role: 'Mahasiswa, Bandung', quote: 'Fitur voice-nya juara. Pas lagi di angkot tinggal pencet mic, catatan ide langsung masuk. Nggak pernah kelewat lagi.' },
  { name: 'Dimas A.', role: 'Freelancer, Jakarta', quote: 'Keuangan kecil-kecilan saya akhirnya rapi. Ringkasan AI-nya nunjukin pola belanja yang saya sendiri nggak sadar.' },
  { name: 'Sari W.', role: 'Ibu rumah tangga, Yogyakarta', quote: 'To-do sama link anak sekolah semuanya di satu tempat. Simpel, cepat, dan nyaman di HP — persis yang saya butuhin.' },
];

const PRICING = {
  free: {
    name: 'Free',
    price: 0,
    tagline: 'Untuk mulai merapikan hidup.',
    features: ['Catatan & to-do tanpa batas', 'Arsip 30 hari terakhir', '1 perangkat', 'Dukungan komunitas'],
  },
  pro: {
    name: 'Pro',
    price: 100000,
    yearly: 249000,
    tagline: 'Untuk yang serius beres-beres.',
    features: ['Voice transcription tanpa batas', 'Ringkasan AI keuangan bulanan', 'Keuangan & Link Saver lengkap', 'Sinkron semua perangkat', 'Prioritas support'],
  },
};

const FAQS = [
  { q: 'Apa itu TemanNyatet?', a: 'TemanNyatet adalah aplikasi all-in-one untuk catatan, pencatatan keuangan, to-do, dan link saver. Semua data tersimpan aman di cloud dan bisa diakses dari HP maupun laptop.' },
  { q: 'Apakah data saya aman?', a: 'Ya. Data disimpan di database PostgreSQL terkelola dengan koneksi terenkripsi, dan akun dilindungi autentikasi aman. Kamu bisa hapus data kapan saja.' },
  { q: 'Bagaimana fitur Voice bekerja?', a: 'Cukup tekan dan tahan tombol mic, lalu bicara. Rekaman dikirim untuk ditranskripsi otomatis menjadi catatan teks — tanpa perlu mengetik.' },
  { q: 'Bisa dipakai di HP dan laptop sekaligus?', a: 'Bisa. TemanNyatet adalah PWA yang responsif — nyaman di iPhone, Android, tablet, maupun desktop. Data tersinkron otomatis di semua perangkat.' },
  { q: 'Bisakah berhenti berlangganan kapan saja?', a: 'Tentu. Berhenti kapan pun tanpa syarat. Kamu tetap bisa mengakses semua data yang sudah dicatat, hanya fitur Pro yang berhenti.' },
];

const LOGOS = ['NusaBank', 'KopiKita', 'SekolahPintar', 'TokoAman', 'GriyaSehat', 'LogistikKilat'];

/* ────────────────────────────────────────────────────────────────
   SPRING CONFIG — dipakai untuk SEMUA animasi interaktif.
   Duration+ease hanya untuk fade-in sederhana (max 0.4s).
   ──────────────────────────────────────────────────────────────── */
const SPRING_SNAPPY = { type: 'spring', stiffness: 400, damping: 30, mass: 0.8 };
const SPRING_SMOOTH = { type: 'spring', stiffness: 200, damping: 28, mass: 1.0 };
const SPRING_BOUNCY = { type: 'spring', stiffness: 500, damping: 20, mass: 0.6 };
const SPRING_SLOW = { type: 'spring', stiffness: 80, damping: 20, mass: 1.2 };

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Jika reduced-motion: semua animasi lompat ke nilai final, durasi 0. */
const T = (spring) => (REDUCED ? { duration: 0 } : spring);

/* ────────────────────────────────────────────────────────────────
   SCROLL-TRIGGERED REVEALS
   ──────────────────────────────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px 0px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={REDUCED ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={T({ ...SPRING_SMOOTH, delay })}
    >
      {children}
    </motion.div>
  );
}

function StaggerParent({ children, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px 0px' });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: REDUCED ? 0 : 0.1 } } }}
    >
      {children}
    </motion.div>
  );
}

const staggerItem = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { ...SPRING_SMOOTH },
  },
};

function WordReveal({ text, className = '' }) {
  const words = text.split(' ');
  return (
    <motion.h1
      className={className}
      style={{ perspective: 800 }}
      initial={REDUCED ? { opacity: 1 } : 'hidden'}
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: REDUCED ? 0 : 0.08 } } }}
    >
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          variants={{
            hidden: REDUCED
              ? { opacity: 1, y: 0, rotateX: 0 }
              : { opacity: 0, y: 20, rotateX: -15 },
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
   CTA BUTTON — shimmer sweep on hover
   ──────────────────────────────────────────────────────────────── */
function PrimaryButton({ children, onClick, className = '' }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={REDUCED ? undefined : { scale: 1.04, y: -2 }}
      whileTap={REDUCED ? undefined : { scale: 0.97 }}
      transition={T(SPRING_BOUNCY)}
      className={`relative overflow-hidden rounded-full px-8 py-4 bg-[#197663] text-white font-semibold text-base shadow-lg shadow-[#197663]/30 ${className}`}
    >
      {!REDUCED && (
        <motion.span
          className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none"
          whileHover={{ translateX: '100%' }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      )}
      <span className="relative">{children}</span>
    </motion.button>
  );
}

/* ────────────────────────────────────────────────────────────────
   STATS COUNT-UP
   ──────────────────────────────────────────────────────────────── */
function CountUp({ target, suffix = '' }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  useEffect(() => {
    if (!inView) return;
    if (REDUCED) { setCount(target); return; }
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      setCount(Math.round(current));
      if (current >= target) clearInterval(timer);
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);
  return <span ref={ref}>{count.toLocaleString('id-ID')}{suffix}</span>;
}

/* ────────────────────────────────────────────────────────────────
   FAQ ACCORDION
   ──────────────────────────────────────────────────────────────── */
function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout className="border-b border-slate-200 dark:border-slate-800">
      <motion.button
        layout
        onClick={() => setOpen(!open)}
        className="w-full flex justify-between items-center py-5 text-left gap-4 cursor-pointer"
        aria-expanded={open}
      >
        <span className="font-semibold text-slate-900 dark:text-slate-100">{question}</span>
        <motion.span
          className="text-xl leading-none text-[#197663] shrink-0"
          animate={{ rotate: open ? 45 : 0 }}
          transition={T(SPRING_SNAPPY)}
        >
          +
        </motion.span>
      </motion.button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={REDUCED ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={REDUCED ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
            transition={{ height: T(SPRING_SMOOTH), opacity: { duration: 0.2 } }}
            className="overflow-hidden"
          >
            <p className="pb-5 text-slate-500 dark:text-slate-400 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────
   ICONS (inline SVG — tanpa dependency)
   ──────────────────────────────────────────────────────────────── */
function Icon({ name, className = 'w-6 h-6' }) {
  const common = { className, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', viewBox: '0 0 24 24' };
  if (name === 'mic')
    return (
      <svg {...common}>
        <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        <line x1="12" y1="19" x2="12" y2="22" />
      </svg>
    );
  if (name === 'wallet')
    return (
      <svg {...common}>
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
      </svg>
    );
  return (
    <svg {...common}>
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

const scrollTo = (id) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
};

/* ────────────────────────────────────────────────────────────────
   LANDING PAGE
   ──────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [dark, setDark] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 80);
    fn();
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  /* Hero parallax */
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -120]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.94]);

  /* Mockup tilt mengikuti mouse (spring). */
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), SPRING_SMOOTH);
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), SPRING_SMOOTH);

  const onHeroMove = (e) => {
    if (REDUCED) return;
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };

  /* Pricing toggle */
  const [annual, setAnnual] = useState(false);

  return (
    <div className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased overflow-x-hidden selection:bg-[#197663]/20">

        {/* ══ 1. NAVBAR — scroll-aware ══ */}
        <motion.nav
          animate={{
            backdropFilter: scrolled ? 'blur(16px)' : 'blur(0px)',
            backgroundColor: scrolled
              ? (dark ? 'rgba(2,6,23,0.85)' : 'rgba(255,255,255,0.85)')
              : 'rgba(255,255,255,0)',
            boxShadow: scrolled ? '0 1px 24px rgba(0,0,0,0.08)' : '0 0px 0px rgba(0,0,0,0)',
            paddingTop: scrolled ? '0.75rem' : '1.25rem',
            paddingBottom: scrolled ? '0.75rem' : '1.25rem',
          }}
          transition={T(SPRING_SNAPPY)}
          className="fixed top-0 left-0 right-0 z-50"
        >
          <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
            <button onClick={() => scrollTo('hero')} className="flex items-center gap-2 cursor-pointer">
              <span className="w-8 h-8 rounded-xl bg-[#197663] flex items-center justify-center text-white font-black text-sm shadow-md shadow-[#197663]/30">
                T
              </span>
              <span className="font-bold tracking-tight text-lg">{PRODUCT}</span>
            </button>

            <div className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300">
              {[['fitur', 'Fitur'], ['cara-kerja', 'Cara Kerja'], ['testimoni', 'Testimoni'], ['harga', 'Harga'], ['faq', 'FAQ']].map(([id, label]) => (
                <button key={id} onClick={() => scrollTo(id)} className="hover:text-[#197663] transition-colors cursor-pointer">
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileTap={REDUCED ? undefined : { scale: 0.9 }}
                transition={T(SPRING_SNAPPY)}
                onClick={() => setDark(!dark)}
                aria-label={dark ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
                className="w-10 h-10 rounded-full border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {dark ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="4" /><line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" /><line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="4" y2="12" /><line x1="20" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" /><line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
              </motion.button>
              <PrimaryButton onClick={() => scrollTo('harga')} className="px-5! py-2.5! text-sm! hidden sm:inline-flex">
                {CTA_TEXT}
              </PrimaryButton>
            </div>
          </div>
        </motion.nav>

        {/* ══ 2. HERO ══ */}
        <section id="hero" onMouseMove={onHeroMove} className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden">
          {/* Background ambient blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
            <motion.div
              className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-[#197663]/15 blur-[80px] will-change-transform"
              animate={REDUCED ? undefined : { x: [0, 30, -20, 0], y: [0, -20, 30, 0], scale: [1, 1.1, 0.95, 1] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-[#F59E0B]/12 blur-[80px] will-change-transform"
              animate={REDUCED ? undefined : { x: [0, -25, 20, 0], y: [0, 25, -15, 0], scale: [1, 0.9, 1.08, 1] }}
              transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
            />
          </div>

          <div className="relative max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-16 items-center">
            {/* Headline + subtext + CTA */}
            <motion.div style={REDUCED ? undefined : { y: heroY, opacity: heroOpacity, scale: heroScale }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#197663]/25 bg-[#197663]/5 text-[#197663] text-xs font-bold uppercase tracking-wider px-4 py-1.5 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]" />
                All-in-one organizer
              </span>

              <WordReveal
                text={TAGLINE}
                className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05]"
              />

              <motion.p
                initial={REDUCED ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={T({ ...SPRING_SMOOTH, delay: 0.35 })}
                className="mt-6 text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg"
              >
                {SUB_TAGLINE}
              </motion.p>

              <motion.div
                initial={REDUCED ? { opacity: 1 } : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={T({ ...SPRING_SMOOTH, delay: 0.45 })}
                className="mt-9 flex flex-wrap items-center gap-4"
              >
                <PrimaryButton onClick={() => scrollTo('harga')}>{CTA_TEXT}</PrimaryButton>
                <motion.button
                  onClick={() => scrollTo('fitur')}
                  whileHover={REDUCED ? undefined : { y: -2 }}
                  whileTap={REDUCED ? undefined : { scale: 0.97 }}
                  transition={T(SPRING_SNAPPY)}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-700 px-7 py-4 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Lihat fitur
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Mockup HP — tilt halus mengikuti mouse */}
            <motion.div
              className="relative flex justify-center will-change-transform"
              style={REDUCED ? undefined : { rotateX: rotX, rotateY: rotY, transformPerspective: 1200 }}
            >
              <div className="relative w-[300px] rounded-[2.5rem] border-[6px] border-slate-900 dark:border-slate-700 bg-slate-900 dark:bg-slate-800 shadow-2xl overflow-hidden">
                {/* notch */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-900 dark:bg-slate-700 rounded-full z-10" />
                <div className="bg-gradient-to-b from-[#197663]/10 to-white dark:to-slate-900 px-5 pt-10 pb-6">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Saldo bulan ini</p>
                  <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">Rp 4.820.500</p>
                  <div className="mt-3 h-2 rounded-full bg-[#197663]/15">
                    <motion.div
                      className="h-2 rounded-full bg-[#197663]"
                      initial={REDUCED ? { width: '68%' } : { width: '12%' }}
                      animate={{ width: '68%' }}
                      transition={T({ ...SPRING_SMOOTH, delay: 0.5 })}
                    />
                  </div>
                </div>
                <div className="px-4 pb-6 space-y-3 bg-white dark:bg-slate-900">
                  {[
                    { c: '#FDE8D7', t: 'Belanja mingguan', s: 'Rp 350.000' },
                    { c: '#DDF3EA', t: 'Catatan: Ide aplikasi', s: 'Kemarin · Voice' },
                    { c: '#E4E7FD', t: 'To-do: Bayar listrik', s: '3 dari 5 selesai' },
                  ].map((card, i) => (
                    <motion.div
                      key={i}
                      initial={REDUCED ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={T({ ...SPRING_SMOOTH, delay: 0.55 + i * 0.12 })}
                      className="rounded-xl p-3.5 shadow-sm border border-slate-100"
                      style={{ backgroundColor: card.c }}
                    >
                      <p className="text-xs font-bold text-slate-800">{card.t}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{card.s}</p>
                    </motion.div>
                  ))}
                  {/* FAB mic */}
                  <motion.div
                    className="w-12 h-12 rounded-full bg-[#197663] text-white flex items-center justify-center shadow-lg shadow-[#197663]/40 ml-auto -mb-1"
                    animate={REDUCED ? undefined : { y: [0, -4, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Icon name="mic" className="w-5 h-5" />
                  </motion.div>
                </div>
              </div>
              {/* floating accent chip */}
              <motion.div
                className="absolute -left-6 top-24 rounded-2xl bg-white dark:bg-slate-800 shadow-xl border border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center gap-2 will-change-transform"
                animate={REDUCED ? undefined : { y: [0, -8, 0] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Ringkasan AI siap</span>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ══ 3. SOCIAL PROOF — stats + logo ticker ══ */}
        <section className="py-14 border-y border-slate-100 dark:border-slate-800">
          <div className="max-w-6xl mx-auto px-5">
            <FadeUp className="grid grid-cols-3 gap-6 text-center">
              {[
                { v: 12000, s: '+', label: 'Pengguna aktif' },
                { v: 240000, s: '+', label: 'Catatan tersimpan' },
                { v: 49, s: ' / 5', label: 'Rating pengguna' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-2xl md:text-4xl font-extrabold text-[#197663]">
                    {stat.v === 49 ? <CountUp target={49} suffix="," /> : <CountUp target={stat.v} />}
                    {stat.s}
                  </p>
                  <p className="mt-1 text-xs md:text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
              ))}
            </FadeUp>

            <FadeUp delay={0.1} className="mt-12">
              <div className="overflow-hidden" aria-hidden="true">
                <motion.div
                  className="flex gap-12 w-max will-change-transform"
                  animate={REDUCED ? undefined : { x: ['0%', '-50%'] }}
                  transition={{ duration: 20, ease: 'linear', repeat: Infinity }}
                >
                  {[...LOGOS, ...LOGOS].map((logo, i) => (
                    <span
                      key={i}
                      className="text-lg font-bold tracking-wide text-slate-400 dark:text-slate-600 grayscale opacity-40 hover:opacity-80 hover:grayscale-0 hover:text-[#197663] transition-all duration-300 whitespace-nowrap"
                    >
                      {logo}
                    </span>
                  ))}
                </motion.div>
              </div>
              <p className="mt-6 text-center text-xs uppercase tracking-widest text-slate-400 dark:text-slate-500 font-semibold">
                Dipercaya ribuan orang untuk merapikan hari-harinya
              </p>
            </FadeUp>
          </div>
        </section>

        {/* ══ 4. FEATURES ══ */}
        <section id="fitur" className="py-24">
          <div className="max-w-6xl mx-auto px-5">
            <FadeUp className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-[#197663] mb-3">Fitur</p>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Semua yang kamu butuhin,<br />dalam satu aplikasi</h2>
            </FadeUp>

            <StaggerParent className="mt-14 grid md:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <motion.div
                  key={f.title}
                  variants={staggerItem}
                  whileHover={REDUCED ? undefined : { y: -6, scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
                  whileTap={REDUCED ? undefined : { scale: 0.98 }}
                  transition={T(SPRING_SNAPPY)}
                  className="[@media(hover:none)]:transform-none rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-2xl bg-[#197663]/10 text-[#197663] flex items-center justify-center mb-5">
                    <Icon name={f.icon} />
                  </div>
                  <h3 className="text-xl font-bold">{f.title}</h3>
                  <p className="mt-2.5 text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </StaggerParent>
          </div>
        </section>

        {/* ══ 5. HOW IT WORKS ══ */}
        <section id="cara-kerja" className="py-24 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-6xl mx-auto px-5">
            <FadeUp className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-[#197663] mb-3">Cara Kerja</p>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Beres dalam 3 langkah</h2>
            </FadeUp>

            <StaggerParent className="mt-14 grid md:grid-cols-3 gap-6">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  variants={staggerItem}
                  whileHover={REDUCED ? undefined : { y: -6 }}
                  transition={T(SPRING_SNAPPY)}
                  className="[@media(hover:none)]:transform-none relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 shadow-sm"
                >
                  <motion.span
                    className="absolute -top-5 left-8 w-10 h-10 rounded-xl bg-[#197663] text-white font-extrabold flex items-center justify-center shadow-lg shadow-[#197663]/30"
                    initial={REDUCED ? { scale: 1 } : { scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={T(SPRING_BOUNCY)}
                  >
                    {i + 1}
                  </motion.span>
                  <h3 className="text-xl font-bold mt-2">{step.title}</h3>
                  <p className="mt-2.5 text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </StaggerParent>
          </div>
        </section>

        {/* ══ 6. TESTIMONIAL ══ */}
        <section id="testimoni" className="py-24">
          <div className="max-w-6xl mx-auto px-5">
            <FadeUp className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-[#197663] mb-3">Testimoni</p>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Kata mereka yang sudah beres</h2>
            </FadeUp>

            <StaggerParent className="mt-14 grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t) => (
                <motion.figure
                  key={t.name}
                  variants={staggerItem}
                  whileHover={REDUCED ? undefined : { y: -6, scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
                  transition={T(SPRING_SNAPPY)}
                  className="[@media(hover:none)]:transform-none rounded-3xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-sm flex flex-col"
                >
                  <div className="flex gap-0.5 text-[#F59E0B] mb-4" aria-label="5 dari 5 bintang">
                    {'★★★★★'.split('').map((s, i) => (
                      <span key={i} className="text-sm">{s}</span>
                    ))}
                  </div>
                  <blockquote className="flex-1 text-slate-600 dark:text-slate-300 leading-relaxed">
                    “{t.quote}”
                  </blockquote>
                  <figcaption className="mt-6 flex items-center gap-3">
                    <span className="w-11 h-11 rounded-full bg-[#197663]/10 text-[#197663] font-bold flex items-center justify-center">
                      {t.name[0]}
                    </span>
                    <span>
                      <span className="block font-bold text-sm">{t.name}</span>
                      <span className="block text-xs text-slate-400">{t.role}</span>
                    </span>
                  </figcaption>
                </motion.figure>
              ))}
            </StaggerParent>
          </div>
        </section>

        {/* ══ 7. PRICING ══ */}
        <section id="harga" className="py-24 bg-slate-50 dark:bg-slate-900/50">
          <div className="max-w-5xl mx-auto px-5">
            <FadeUp className="text-center max-w-2xl mx-auto">
              <p className="text-xs font-bold uppercase tracking-widest text-[#197663] mb-3">Harga</p>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Mulai gratis, upgrade kapan pun</h2>
            </FadeUp>

            <FadeUp delay={0.1} className="mt-10 flex justify-center">
              <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-700 px-5 py-3">
                <span className={`text-sm font-semibold ${!annual ? 'text-[#197663]' : 'text-slate-500 dark:text-slate-400'}`}>Bulanan</span>
                <motion.button
                  onClick={() => setAnnual(!annual)}
                  role="switch"
                  aria-checked={annual}
                  aria-label="Beralih billing tahunan"
                  className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-[#197663]' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <motion.span
                    className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow"
                    animate={{ x: annual ? 24 : 0 }}
                    transition={T(SPRING_BOUNCY)}
                  />
                </motion.button>
                <span className={`text-sm font-semibold ${annual ? 'text-[#197663]' : 'text-slate-500 dark:text-slate-400'}`}>
                  Tahunan{' '}
                  <em className="not-italic text-[#197663] text-xs font-bold ml-1">Hemat 79%</em>
                </span>
              </div>
            </FadeUp>

            <StaggerParent className="mt-12 grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {[PRICING.free, PRICING.pro].map((tier) => {
                const isPro = tier.name === 'Pro';
                return (
                  <motion.div
                    key={tier.name}
                    variants={staggerItem}
                    whileHover={REDUCED ? undefined : { y: -6, scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.12)' }}
                    whileTap={REDUCED ? undefined : { scale: 0.98 }}
                    transition={T(SPRING_SNAPPY)}
                    className={`[@media(hover:none)]:transform-none relative rounded-3xl p-8 ${
                      isPro
                        ? 'bg-[#197663] text-white shadow-2xl shadow-[#197663]/30'
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    {isPro && (
                      <span className="absolute right-5 top-5 rounded-full bg-[#F59E0B] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1">
                        Populer
                      </span>
                    )}
                    <h3 className="text-lg font-bold">{tier.name}</h3>
                    <p className={`mt-1 text-sm ${isPro ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}`}>{tier.tagline}</p>

                    <div className="mt-6 flex items-end gap-1.5 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${tier.name}-${annual}`}
                          initial={REDUCED ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={REDUCED ? { opacity: 1, y: 0 } : { opacity: 0, y: -14 }}
                          transition={T(SPRING_SNAPPY)}
                          className="text-4xl font-extrabold tracking-tight"
                        >
                          {isPro
                            ? `Rp ${(annual ? tier.yearly : tier.price).toLocaleString('id-ID')}`
                            : 'Rp 0'}
                        </motion.span>
                      </AnimatePresence>
                      <span className={`pb-1 text-sm ${isPro ? 'text-white/60' : 'text-slate-400'}`}>
                        {isPro ? (annual ? '/ tahun' : '/ bulan') : 'selamanya'}
                      </span>
                    </div>

                    <ul className="mt-7 space-y-3">
                      {tier.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <svg
                            className={`w-4 h-4 mt-0.5 shrink-0 ${isPro ? 'text-white' : 'text-[#197663]'}`}
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                            strokeLinecap="round" strokeLinejoin="round"
                          >
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                          <span className={isPro ? 'text-white/90' : 'text-slate-600 dark:text-slate-300'}>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <motion.button
                      onClick={() => scrollTo('hero')}
                      whileHover={REDUCED ? undefined : { scale: 1.03, y: -2 }}
                      whileTap={REDUCED ? undefined : { scale: 0.97 }}
                      transition={T(SPRING_BOUNCY)}
                      className={`mt-8 w-full rounded-full py-3.5 font-semibold transition-colors cursor-pointer ${
                        isPro
                          ? 'bg-white text-[#197663] hover:bg-slate-50'
                          : 'bg-[#197663] text-white hover:opacity-90'
                      }`}
                    >
                      {isPro ? 'Upgrade ke Pro' : 'Mulai Gratis'}
                    </motion.button>
                  </motion.div>
                );
              })}
            </StaggerParent>
          </div>
        </section>

        {/* ══ 8. FAQ ══ */}
        <section id="faq" className="py-24">
          <div className="max-w-3xl mx-auto px-5">
            <FadeUp className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-[#197663] mb-3">FAQ</p>
              <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Masih ragu?</h2>
            </FadeUp>
            <FadeUp delay={0.1}>
              {FAQS.map((f) => (
                <FAQItem key={f.q} question={f.q} answer={f.a} />
              ))}
            </FadeUp>
          </div>
        </section>

        {/* ══ 9. CTA FINAL ══ */}
        <section className="relative py-28 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <motion.div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-[#197663]/15 blur-[100px] will-change-transform"
              animate={REDUCED ? undefined : { scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <FadeUp className="relative max-w-3xl mx-auto px-5 text-center">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              Siap membereskan urusanmu?
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Gabung ribuan orang yang mulai dari satu catatan kecil — dan nggak berhenti sampai semuanya beres.
            </p>
            <div className="mt-9 flex justify-center">
              <PrimaryButton onClick={() => scrollTo('harga')}>{CTA_TEXT} — nggak perlu kartu kredit</PrimaryButton>
            </div>
          </FadeUp>
        </section>

        {/* ══ 10. FOOTER ══ */}
        <footer className="border-t border-slate-100 dark:border-slate-800 py-16">
          <div className="max-w-6xl mx-auto px-5 grid grid-cols-2 md:grid-cols-5 gap-10">
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-xl bg-[#197663] flex items-center justify-center text-white font-black text-sm">T</span>
                <span className="font-bold tracking-tight text-lg">{PRODUCT}</span>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                Satu aplikasi untuk catatan, keuangan, to-do, dan link. Dibuat untuk hidup yang lebih beres.
              </p>
            </div>
            {[
              { h: 'Produk', links: ['Fitur', 'Cara Kerja', 'Harga', 'FAQ'] },
              { h: 'Perusahaan', links: ['Tentang', 'Blog', 'Karier', 'Kontak'] },
              { h: 'Bantuan', links: ['Pusat Bantuan', 'Status', 'Komunitas'] },
              { h: 'Legal', links: ['Privasi', 'Syarat', 'Keamanan'] },
            ].map((col) => (
              <div key={col.h}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">{col.h}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}>
                      <button onClick={() => scrollTo('faq')} className="text-sm text-slate-600 dark:text-slate-300 hover:text-[#197663] transition-colors cursor-pointer">
                        {l}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="max-w-6xl mx-auto px-5 mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-400">© 2026 {PRODUCT}. Semua hak dilindungi.</p>
            <p className="text-xs text-slate-400">Dibuat dengan ❤️ di Indonesia</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
