import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, animate, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { NotebookPen, Wallet, CheckSquare, Link2 } from 'lucide-react';
import SheetFormContent from '@/components/SheetFormContent';

// Fixed heights (px)
const HANDLE_H    = 28;
const NAV_H       = 68;
const COLLAPSED_H = HANDLE_H + NAV_H; // 96 — only this is visible when collapsed

const NAV_ITEMS = [
  { name: 'Catatan',    path: '/catatan',   icon: NotebookPen },
  { name: 'Keuangan',   path: '/keuangan',  icon: Wallet      },
  { name: 'To-do',      path: '/todo',      icon: CheckSquare },
  { name: 'Link Saver', path: '/linksaver', icon: Link2       },
];

type SnapState = 'collapsed' | 'half' | 'expanded';

export default function BottomSheetNav() {
  const [location, navigate] = useLocation();

  const [screenH, setScreenH] = useState(window.innerHeight);
  useEffect(() => {
    const onResize = () => setScreenH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const SNAP: Record<SnapState, number> = {
    collapsed: COLLAPSED_H,
    half:      Math.round(screenH * 0.58),
    expanded:  Math.round(screenH * 0.88),
  };

  // Animate HEIGHT — pill grows upward since it's bottom-anchored
  const h = useMotionValue(SNAP.collapsed);
  const [snapState, setSnapState] = useState<SnapState>('collapsed');

  useEffect(() => { h.set(SNAP[snapState]); }, [screenH]);

  // Re-collapse when navigating to a new tab
  const prevLocation = useRef(location);
  useEffect(() => {
    if (location !== prevLocation.current) {
      prevLocation.current = location;
      snapTo('collapsed');
    }
  }, [location]);

  const snapTo = (state: SnapState) => {
    animate(h, SNAP[state], { type: 'spring', stiffness: 320, damping: 36, restDelta: 0.5 });
    setSnapState(state);
  };

  // Drag — pointer capture on the handle bar only
  const dragStartClientY = useRef(0);
  const dragStartH       = useRef(0);
  const samples          = useRef<{ t: number; y: number }[]>([]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartClientY.current = e.clientY;
    dragStartH.current       = h.get();
    samples.current = [{ t: Date.now(), y: e.clientY }];
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    // Upward finger movement (negative delta) → pill grows taller
    const delta = dragStartClientY.current - e.clientY;
    const next  = Math.max(SNAP.collapsed, Math.min(SNAP.expanded, dragStartH.current + delta));
    h.set(next);
    samples.current.push({ t: Date.now(), y: e.clientY });
    if (samples.current.length > 8) samples.current.shift();
  };

  const onPointerUp = () => {
    const cur = h.get();
    let vel = 0;
    if (samples.current.length >= 2) {
      const a = samples.current[0], b = samples.current[samples.current.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt > 0) vel = (b.y - a.y) / dt; // positive = moving DOWN = shrink
    }
    if (vel > 500) {
      snapTo('collapsed');
    } else if (vel < -400) {
      snapTo(snapState === 'collapsed' ? 'half' : 'expanded');
    } else {
      const nearest = (Object.entries(SNAP) as [SnapState, number][])
        .reduce((best, [k, v]) => Math.abs(cur - v) < Math.abs(cur - SNAP[best]) ? k : best, 'collapsed' as SnapState);
      snapTo(nearest);
    }
  };

  const isOpen = snapState !== 'collapsed';

  return (
    <>
      {/* Dim backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => snapTo('collapsed')}
          />
        )}
      </AnimatePresence>

      {/*
        Floating pill — same position as original BottomNav.
        Bottom-anchored so height growth goes UPWARD.
      */}
      <motion.div
        className="fixed left-1/2 z-50 -translate-x-1/2 w-[calc(100%-2.5rem)] max-w-sm"
        style={{
          bottom: 20,
          height: h,
          borderRadius: 24,
          overflow: 'hidden',
        }}
      >
        <div
          className="bg-card border border-border/30 shadow-[0_4px_32px_rgba(0,0,0,0.14)] h-full flex flex-col"
          style={{ borderRadius: 24 }}
        >
          {/* ── Drag Handle ── */}
          <div
            className="flex-shrink-0 flex justify-center items-center cursor-grab active:cursor-grabbing touch-none select-none"
            style={{ height: HANDLE_H }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="w-9 h-[5px] rounded-full bg-muted-foreground/25" />
          </div>

          {/* ── Inline form — only rendered when sheet is open ── */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {isOpen && (
              <div className="h-full overflow-y-auto overflow-x-hidden px-4 pb-3 pt-1">
                <SheetFormContent
                  path={location}
                  onSuccess={() => snapTo('collapsed')}
                />
              </div>
            )}
          </div>

          {/* ── Nav Tabs — always pinned at the bottom of the pill ── */}
          <div
            className="flex-shrink-0 border-t border-border/20 flex justify-around items-center px-1 bg-card"
            style={{ height: NAV_H, borderRadius: '0 0 24px 24px' }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = location.startsWith(item.path);
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className="flex flex-col items-center justify-center flex-1 h-full gap-0.5"
                >
                  <div
                    className={`w-11 h-9 flex items-center justify-center rounded-xl transition-all duration-200 ${
                      isActive ? 'bg-primary scale-105' : ''
                    }`}
                  >
                    <Icon
                      size={22}
                      className={isActive ? 'text-primary-foreground' : 'text-muted-foreground'}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                  </div>
                  <span className={`text-[10px] font-semibold tracking-wide leading-none ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </motion.div>
    </>
  );
}
