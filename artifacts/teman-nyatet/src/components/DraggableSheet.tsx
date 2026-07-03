import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';
import { NotebookPen, Wallet, CheckSquare, Link2, ChevronUp } from 'lucide-react';
import { useCreate } from '@/contexts/CreateContext';

const PEEK_HEIGHT = 80;
// BottomNav: fixed bottom-5 (20px) + h-[68px] = 88px from bottom
const NAV_OFFSET = 88;

type SnapState = 'collapsed' | 'half' | 'expanded';

const ACTIONS = [
  { label: 'Tambah Catatan', section: 'note' as const, path: '/catatan', icon: NotebookPen, bg: '#E8F2DF', color: '#3D6B4F' },
  { label: 'Tambah Keuangan', section: 'keuangan' as const, path: '/keuangan', icon: Wallet, bg: '#FFF8D6', color: '#8B6914' },
  { label: 'Tambah To-Do', section: 'todo' as const, path: '/todo', icon: CheckSquare, bg: '#E1F0FF', color: '#3D6B96' },
  { label: 'Tambah Link', section: 'link' as const, path: '/linksaver', icon: Link2, bg: '#FFE4E1', color: '#963D3D' },
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
      stiffness: 350,
      damping: 38,
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

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {showBackdrop && (
          <motion.div
            key="sheet-backdrop"
            className="fixed inset-0 z-20 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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
      >
        <div className="bg-white rounded-t-[32px] shadow-[0_-8px_48px_rgba(0,0,0,0.13)] h-full flex flex-col overflow-hidden">

          {/* Drag handle — only this area is draggable */}
          <div
            className="flex-shrink-0 flex flex-col items-center pt-3 pb-3 cursor-grab active:cursor-grabbing touch-none"
            onPointerDown={onHandlePointerDown}
            onPointerMove={onHandlePointerMove}
            onPointerUp={onHandlePointerUp}
            onPointerCancel={onHandlePointerUp}
          >
            <div className="w-10 h-1.5 rounded-full bg-gray-200 mb-3" />
            <div className="flex items-center gap-1 text-gray-400">
              <ChevronUp size={13} strokeWidth={2.5} />
              <span className="text-[11px] font-bold uppercase tracking-widest">Tambah Baru</span>
            </div>
          </div>

          {/* Action grid — scrollable, does not trigger drag */}
          <div className="flex-1 overflow-y-auto px-5 pb-8 pt-1">
            <div className="grid grid-cols-2 gap-3">
              {ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.section}
                    onClick={() => handleAction(action.section, action.path)}
                    className="flex items-center gap-3 p-4 rounded-2xl text-left transition-all active:scale-[0.95] hover:brightness-95"
                    style={{ backgroundColor: action.bg }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white/50"
                    >
                      <Icon size={20} style={{ color: action.color }} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-bold leading-tight" style={{ color: action.color }}>
                      {action.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
