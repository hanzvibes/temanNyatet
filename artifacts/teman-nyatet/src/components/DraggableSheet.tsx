import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { NotebookPen, Wallet, CheckSquare, Link2, ChevronUp, X } from 'lucide-react';
import { useCreate } from '@/contexts/CreateContext';

const PEEK_HEIGHT = 92;
// BottomNav: fixed bottom-3 (12px) + h-16 (64 nav) + 32 (handle) = 108 from bottom edge.
const NAV_OFFSET = 108;

type SnapState = 'collapsed' | 'half' | 'expanded';

const ACTIONS = [
  { label: 'Tambah Catatan',  section: 'note'    as const, path: '/catatan',   icon: NotebookPen, bg: '#E8F2DF', color: '#3D6B4F', ring: '#C4DAB2' },
  { label: 'Tambah Keuangan', section: 'keuangan' as const, path: '/keuangan',  icon: Wallet,      bg: '#FFF8D6', color: '#8B6914', ring: '#E8DBA1' },
  { label: 'Tambah To-Do',    section: 'todo'    as const, path: '/todo',      icon: CheckSquare, bg: '#E1F0FF', color: '#3D6B96', ring: '#B7D4F2' },
  { label: 'Tambah Link',     section: 'link'    as const, path: '/linksaver', icon: Link2,       bg: '#FFE4E1', color: '#963D3D', ring: '#F2BFB7' },
];

export default function DraggableSheet() {
  const [, navigate] = useLocation();
  const { triggerCreate } = useCreate();

  const [screenH, setScreenH] = useState(window.innerHeight);

  useEffect(() => {
    const onResize = () => setScreenH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const SHEET_H = Math.round(screenH * 0.9);

  const SNAP: Record<SnapState, number> = {
    collapsed: SHEET_H - PEEK_HEIGHT,
    half: Math.round(SHEET_H * 0.5),
    expanded: 0,
  };

  const y = useMotionValue(SNAP.collapsed);
  const [snapState, setSnapState] = useState<SnapState>('collapsed');

  // Update snap position when screen resizes
  useEffect(() => {
    y.set(SNAP[snapState]);
  }, [screenH]);

  const snapTo = (state: SnapState) => {
    animate(y, SNAP[state], {
      type: 'spring',
      stiffness: 340,
      damping: 36,
      restDelta: 0.5,
    });
    setSnapState(state);
  };

  // Manual drag on handlebar only
  const dragStartClientY = useRef(0);
  const dragStartMotionY = useRef(0);
  const pointerSamples = useRef<{ t: number; y: number }[]>([]);

  const onHandlePointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartClientY.current = e.clientY;
    dragStartMotionY.current = y.get();
    pointerSamples.current = [{ t: Date.now(), y: e.clientY }];
  };

  const onHandlePointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const delta = e.clientY - dragStartClientY.current;
    const next = Math.max(0, Math.min(SNAP.collapsed, dragStartMotionY.current + delta));
    y.set(next);
    pointerSamples.current.push({ t: Date.now(), y: e.clientY });
    if (pointerSamples.current.length > 8) pointerSamples.current.shift();
  };

  const onHandlePointerUp = () => {
    const current = y.get();

    // Compute velocity (px/s)
    const samples = pointerSamples.current;
    let velocity = 0;
    if (samples.length >= 2) {
      const first = samples[0];
      const last = samples[samples.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0) velocity = (last.y - first.y) / dt;
    }

    if (velocity > 500) {
      // Fast flick down → collapse
      snapTo('collapsed');
    } else if (velocity < -500) {
      // Fast flick up → next level
      if (snapState === 'collapsed') snapTo('half');
      else snapTo('expanded');
    } else {
      // Snap to nearest
      const nearest = (Object.entries(SNAP) as [SnapState, number][]).reduce(
        (best, [k, v]) =>
          Math.abs(current - v) < Math.abs(current - SNAP[best]) ? k : best,
        'collapsed' as SnapState
      );
      snapTo(nearest);
    }
  };

  const handleAction = (section: typeof ACTIONS[0]['section'], path: string) => {
    snapTo('collapsed');
    navigate(path);
    // Use rAF so navigation re-render settles first
    requestAnimationFrame(() => triggerCreate(section));
  };

  const showBackdrop = snapState !== 'collapsed';
  const isPeek = snapState === 'collapsed';

  return (
    <>
      {/* Backdrop — gradient + blur so it reads as depth, not flat dim. */}
      <AnimatePresence>
        {showBackdrop && (
          <motion.div
            key="sheet-backdrop"
            className="fixed inset-0 z-20 bg-gradient-to-t from-black/55 via-black/20 to-transparent backdrop-blur-[3px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
            onClick={() => snapTo('collapsed')}
          />
        )}
      </AnimatePresence>

      {/* Sheet */}
      <motion.div
        className="fixed left-0 right-0 max-w-md mx-auto z-30"
        style={{
          bottom: NAV_OFFSET,
          height: SHEET_H,
          y,
        }}
        draggable={isPeek ? 'false' : undefined}
      >
        <div className="bg-white rounded-t-[36px] shadow-[0_-12px_60px_-12px_rgba(0,0,0,0.25),0_-4px_24px_-8px_rgba(0,0,0,0.12)] h-full flex flex-col overflow-hidden border-t border-black/[0.04]">

          {/* Drag handle — only this area is draggable */}
          <div
            className="flex-shrink-0 flex flex-col items-center pt-3 pb-2.5 cursor-grab active:cursor-grabbing touch-none relative"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
            role="button"
            aria-label={showBackdrop ? 'Tutup panel Tambah Baru' : 'Buka panel Tambah Baru'}
          >
            <motion.div
              className="rounded-full bg-muted-foreground/40"
              animate={{ width: isPeek ? 44 : 56, height: 5 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            />
            <div className="mt-3 flex items-center justify-center gap-1.5 text-foreground/80 w-full px-5">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <div
                  className={`transition-transform duration-300 ${
                    isPeek ? 'rotate-0' : '-rotate-180'
                  }`}
                >
                  <ChevronUp size={13} strokeWidth={2.5} />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em]">
                  {isPeek ? 'Tarik untuk melihat aksi' : 'Tambah Baru'}
                </span>
              </div>
              {/* Close button only when open — gives a clear dismiss affordance. */}
              {!isPeek && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    snapTo('collapsed');
                  }}
                  className="absolute right-4 top-1/2 -translate-y-[60%] h-8 w-8 rounded-full bg-muted/70 hover:bg-muted active:scale-95 transition-all flex items-center justify-center"
                  aria-label="Tutup"
                >
                  <X size={15} strokeWidth={2.4} className="text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Subtle ambient hint on peek — horizontal divider to suggest more content. */}
          {isPeek && (
            <div className="px-5 -mt-1 mb-1">
              <div className="h-px bg-gradient-to-r from-transparent via-border/70 to-transparent" />
            </div>
          )}

          {/* Action grid — scrollable, does not trigger drag */}
          <div className="flex-1 overflow-y-auto px-5 pb-10 pt-1">
            <div className="grid grid-cols-2 gap-3.5">
              {ACTIONS.map((action, i) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.section}
                    type="button"
                    onClick={() => handleAction(action.section, action.path)}
                    className="relative flex items-center gap-3 p-4 rounded-2xl text-left bg-white border transition-all duration-200 ease-out active:scale-[0.96] hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      borderColor: action.ring,
                      boxShadow: `0 1px 0 0 ${action.bg} inset, 0 1px 2px 0 rgba(0,0,0,0.04)`,
                    }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.08 + i * 0.05, type: 'spring', stiffness: 280, damping: 28 }}
                  >
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: action.bg }}
                    >
                      <Icon size={20} style={{ color: action.color }} strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0">
                      <span
                        className="block text-sm font-bold leading-tight"
                        style={{ color: action.color }}
                      >
                        {action.label}
                      </span>
                      <span className="block text-[10px] font-medium text-muted-foreground mt-0.5 leading-tight">
                        {action.path === '/catatan'   && 'Buat catatan baru'}
                        {action.path === '/keuangan'  && 'Catat transaksi'}
                        {action.path === '/todo'      && 'Tambah daftar tugas'}
                        {action.path === '/linksaver' && 'Simpan tautan'}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Footer hint — discoverability for the swipe gesture. */}
            <p className="mt-6 text-center text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/70">
              Tarik ke atas untuk melihat semua aksi
            </p>
          </div>
        </div>
      </motion.div>
    </>
  );
}
