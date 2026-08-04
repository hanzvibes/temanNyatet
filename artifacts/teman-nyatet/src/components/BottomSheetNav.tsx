import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'wouter';
import { NotebookPen, Wallet, CheckSquare, Link2 } from 'lucide-react';
import SheetFormContent from '@/components/SheetFormContent';
import { useHaptic, HAPTIC } from '@/hooks/useHaptic';
import { useOrientation } from '@/hooks/useOrientation';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import type { TransactionType } from '@/lib/database.types';
import VoiceRecordButton from '@/components/VoiceRecordButton';
import {
  createBottomNavScrollState,
  getBottomNavMaxOffset,
  updateBottomNavScroll,
} from '@/lib/bottom-nav-scroll';
import {
  getActiveOverlaySources,
  OVERLAY_EVENT,
  publishOverlayState,
} from '@/lib/overlay-state';

// Responsive heights (px)
// Bottom-nav geometry matches the value in index.css (`--bottom-nav-collapsed-h`).
// Keep the compact phone layout comfortable while allowing wider phones and
// tablets a little more breathing room.
const getNavMetrics = (width: number) => ({
  handle: width < 380 ? 30 : width >= 640 ? 34 : 32,
  nav: width < 380 ? 60 : width >= 640 ? 68 : 64,
});

const NAV_ITEMS = [
  { name: 'Catatan',    path: '/catatan',   icon: NotebookPen },
  { name: 'Keuangan',   path: '/keuangan',  icon: Wallet      },
  { name: 'To-do',      path: '/todo',      icon: CheckSquare },
  { name: 'Link Saver', path: '/linksaver', icon: Link2       },
];

type SnapState = 'collapsed' | 'half' | 'expanded';

export default function BottomSheetNav() {
  const [location, navigate] = useLocation();
  const haptic = useHaptic();
  const { isLandscape } = useOrientation();
  const prefersReducedMotion = usePrefersReducedMotion();
  const [screenW, setScreenW] = useState(() => window.innerWidth);

  // Use visualViewport when available so the sheet shrinks correctly when
  // the mobile keyboard opens, instead of staying behind it.
  const [screenH, setScreenH] = useState(() => window.visualViewport?.height ?? window.innerHeight);
  const [requestedTransactionType, setRequestedTransactionType] = useState<TransactionType | undefined>();
  useEffect(() => {
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setScreenH(window.visualViewport?.height ?? window.innerHeight);
        setScreenW(window.innerWidth);
      });
    };
    window.visualViewport?.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const { handle: HANDLE_H, nav: NAV_H } = getNavMetrics(screenW);
  const COLLAPSED_H = HANDLE_H + NAV_H;

  // In landscape the viewport is short, so keep the sheet lower so the page
  // behind it remains usable. In portrait we can expand nearly to the top.
  const SNAP: Record<SnapState, number> = {
    collapsed: COLLAPSED_H,
    half:      Math.round(screenH * (isLandscape ? 0.40 : 0.58)),
    expanded:  Math.round(screenH * (isLandscape ? 0.60 : 0.88)),
  };

  // Animate HEIGHT — pill grows upward since it's bottom-anchored.
  // Open at the half snap by default so navigation and primary actions are
  // immediately discoverable on every app page.
  const initialSnap: SnapState = 'half';
  const h = useMotionValue(SNAP[initialSnap]);
  const navScrollOffset = useMotionValue(0);
  const scrollState = useRef(createBottomNavScrollState());
  const scrollTarget = useRef<EventTarget | null>(null);
  const navElementRef = useRef<HTMLDivElement>(null);
  const [bottomGap, setBottomGap] = useState(12);
  const [isAnyOverlayOpen, setIsAnyOverlayOpen] = useState(
    () => getActiveOverlaySources().length > 0,
  );
  const [snapState, setSnapState] = useState<SnapState>(initialSnap);

  useEffect(() => { h.set(SNAP[snapState]); }, [screenH, screenW]);

  useEffect(() => {
    const updateBottomGap = () => {
      const computedBottom = navElementRef.current
        ? Number.parseFloat(getComputedStyle(navElementRef.current).bottom)
        : 12;
      setBottomGap(Number.isFinite(computedBottom) ? computedBottom : 12);
    };

    updateBottomGap();
    window.addEventListener('resize', updateBottomGap);
    window.visualViewport?.addEventListener('resize', updateBottomGap);
    return () => {
      window.removeEventListener('resize', updateBottomGap);
      window.visualViewport?.removeEventListener('resize', updateBottomGap);
    };
  }, [screenH, screenW]);

  // Broadcast open/closed state on the shared overlay channel.
  useEffect(() => {
    publishOverlayState('bottom-sheet-nav', snapState !== 'collapsed');
  }, [snapState]);

  useEffect(() => {
    return () => publishOverlayState('bottom-sheet-nav', false);
  }, []);

  useEffect(() => {
    const handleOverlayChange = (event: Event) => {
      const detail = (event as CustomEvent<{
        activeSources?: string[];
        open?: boolean;
      }>).detail;
      setIsAnyOverlayOpen(
        Array.isArray(detail?.activeSources)
          ? detail.activeSources.length > 0
          : getActiveOverlaySources().length > 0 || detail?.open === true,
      );
    };

    window.addEventListener(OVERLAY_EVENT, handleOverlayChange);
    return () => window.removeEventListener(OVERLAY_EVENT, handleOverlayChange);
  }, []);

  // Keep the sheet at the comfortable half snap when navigating.
  const prevLocation = useRef(location);
  useEffect(() => {
    if (location !== prevLocation.current) {
      prevLocation.current = location;
      snapTo('half');
    }
  }, [location]);

  // Stiffness 280 / damping 32 / mass 0.85 → damping ratio ζ ≈ 0.96 (just below
  // critical). The release-side velocity passthrough lets a flick carry straight
  // through release instead of restarting from rest, which previously felt like
  // a brief hesitation before the pill settled on its snap target.
  const snapTo = (state: SnapState, initialVelocity = 0) => {
    animate(h, SNAP[state], {
      type: 'spring',
      stiffness: 280,
      damping: 32,
      mass: 0.85,
      restDelta: 0.5,
      restSpeed: 0.01,
      velocity: initialVelocity,
    });
    setSnapState(state);
  };

  // Keep the nav linked to the active scroll surface without causing React
  // renders on every frame. The capture listener sees scroll events from
  // nested overflow containers because native scroll events do not bubble.
  useEffect(() => {
    let frame = 0;
    let pendingEvent: Event | null = null;

    const readScrollTop = (event: Event): number => {
      const target = event.target;
      if (target instanceof Element) return target.scrollTop;
      return window.scrollY || document.documentElement.scrollTop || 0;
    };

    const flush = () => {
      frame = 0;
      if (
        !pendingEvent ||
        snapState !== 'collapsed' ||
        isAnyOverlayOpen ||
        prefersReducedMotion
      ) {
        pendingEvent = null;
        return;
      }

      const event = pendingEvent;
      pendingEvent = null;
      if (event.target !== scrollTarget.current) {
        scrollTarget.current = event.target;
        scrollState.current = createBottomNavScrollState();
      }

      const next = updateBottomNavScroll(
        scrollState.current,
        readScrollTop(event),
        getBottomNavMaxOffset(COLLAPSED_H, bottomGap),
      );
      scrollState.current = next;
      navScrollOffset.set(next.offset);
    };

    const handleScroll = (event: Event) => {
      pendingEvent = event;
      if (!frame) frame = window.requestAnimationFrame(flush);
    };

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('scroll', handleScroll, true);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [
    COLLAPSED_H,
    bottomGap,
    isAnyOverlayOpen,
    navScrollOffset,
    prefersReducedMotion,
    snapState,
  ]);

  // An expanded sheet owns the bottom edge. Reset the scroll-linked offset
  // while it is open. Other overlays and reduced-motion users also keep the
  // bar visible instead of applying scroll-linked transforms.
  useEffect(() => {
    if (
      snapState !== 'collapsed' ||
      isAnyOverlayOpen ||
      prefersReducedMotion
    ) {
      scrollState.current = createBottomNavScrollState();
      scrollTarget.current = null;
      navScrollOffset.set(0);
    }
  }, [
    isAnyOverlayOpen,
    navScrollOffset,
    prefersReducedMotion,
    snapState,
  ]);

  // Allow page-level action buttons to open the shared sheet without coupling
  // those pages to the sheet's internal motion state.
  useEffect(() => {
    const handleOpenRequest = (event: Event) => {
      const transactionType = (event as CustomEvent<{ transactionType?: TransactionType }>).detail?.transactionType;
      setRequestedTransactionType(transactionType);
      snapTo('half');
    };
    window.addEventListener('teman-nyatet:open-bottom-sheet', handleOpenRequest);
    return () => window.removeEventListener('teman-nyatet:open-bottom-sheet', handleOpenRequest);
  }, [SNAP.half]);

  // Drag — pointer capture on the handle bar only.
  const dragStartClientY = useRef(0);
  const dragStartH       = useRef(0);
  const samples          = useRef<{ t: number; y: number }[]>([]);
  const isDragging       = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartClientY.current = e.clientY;
    dragStartH.current       = h.get();
    samples.current = [{ t: Date.now(), y: e.clientY }];
    isDragging.current = false;
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const delta = dragStartClientY.current - e.clientY;
    if (Math.abs(delta) > 4) isDragging.current = true;
    const next  = Math.max(SNAP.collapsed, Math.min(SNAP.expanded, dragStartH.current + delta));
    h.set(next);
    samples.current.push({ t: Date.now(), y: e.clientY });
    if (samples.current.length > 8) samples.current.shift();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!isDragging.current && Math.abs(dragStartClientY.current - e.clientY) < 4) {
      // Tap on handle → toggle between collapsed and the half snap.
      snapTo(snapState === 'collapsed' ? 'half' : 'collapsed');
      return;
    }
    const cur = h.get();
    // Samples store clientY. The motion value we animate is `h` (height), and
    // h grows when the user drags UP — opposite to client-y. Flip the sign
    // before handing the velocity to the spring so a flick up keeps opening.
    let clientVel = 0;
    if (samples.current.length >= 2) {
      const a = samples.current[0], b = samples.current[samples.current.length - 1];
      const dt = (b.t - a.t) / 1000;
      if (dt > 0) clientVel = (b.y - a.y) / dt;
    }
    const heightVel = -clientVel;

    let target: SnapState;
    if (clientVel > 500) {
      // Fast flick down → close
      target = 'collapsed';
    } else if (clientVel < -500) {
      // Fast flick up → open further (was -400, harmonized with DraggableSheet)
      target = snapState === 'collapsed' ? 'half' : 'expanded';
    } else {
      target = (Object.entries(SNAP) as [SnapState, number][])
        .reduce((best, [k, v]) => Math.abs(cur - v) < Math.abs(cur - SNAP[best]) ? k : best, 'collapsed' as SnapState);
    }
    // Hand the height-direction velocity to the spring so a flick keeps
    // moving on release instead of starting from rest.
    snapTo(target, heightVel);
  };

  const isOpen = snapState !== 'collapsed';
  const voiceButtonBottom = useTransform(
    h,
    (height) => height + bottomGap + 16,
  );

  const handleVoiceTranscript = (text: string) => {
    window.dispatchEvent(
      new CustomEvent('teman-nyatet:voice-transcript', { detail: { text } }),
    );
  };

  return (
    <div className="lg:hidden">
      {/* Soft dim backdrop — gradient + light blur. Tapping collapses pill. */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="pnav-backdrop"
            className="fixed inset-0 z-40 bg-gradient-to-t from-black/45 via-black/15 to-transparent backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            onClick={() => snapTo('collapsed')}
          />
        )}
      </AnimatePresence>

      {/* Floating pill */}
      <motion.div
        ref={navElementRef}
        className="fixed left-1/2 z-50
                   w-[calc(100%-1rem)] min-[380px]:w-[calc(100%-1.5rem)]
                   sm:w-[calc(100%-2.5rem)] max-w-[28rem]
                   will-change-[height,transform,opacity]"
        style={{
          bottom: 'max(12px, env(safe-area-inset-bottom))',
          height: h,
          x: '-50%',
          y: navScrollOffset,
          borderRadius: 30,
          overflow: 'hidden',
        }}
        // Soft elevation animated by hover/state for cohesive depth.
        initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
        animate={{ opacity: 1 }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { delay: 0.1, type: 'spring', stiffness: 220, damping: 26 }
        }
      >
        <div
            className="bg-card/95 border border-border/70 shadow-[0_14px_36px_-16px_rgba(15,35,25,0.34),0_4px_12px_-6px_rgba(15,35,25,0.16)] h-full flex flex-col backdrop-blur-xl"
          style={{ borderRadius: 30 }}
        >
          {/* Drag Handle — wider, more prominent, with subtle pulse on idle */}
          <div
            className="flex-shrink-0 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none select-none pt-2.5 pb-1.5"
            style={{ height: HANDLE_H }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            role="button"
            aria-label={isOpen ? 'Tutup panel' : 'Buka panel'}
          >
            <div
              className={`rounded-full transition-all duration-200 ${
                isOpen ? 'w-2.5 h-1 bg-muted-foreground/70' : 'w-10 h-1.5 bg-muted-foreground/45'
              }`}
            />
          </div>

          {/* Inline form — only rendered when sheet is open */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  key="pnav-form"
                  className="h-full overflow-y-auto overflow-x-hidden px-4 pb-3 pt-1 overscroll-contain"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                >
                  <SheetFormContent
                    path={location}
                    initialTransactionType={requestedTransactionType}
                    onSuccess={() => {
                      haptic(HAPTIC.success);
                      snapTo('collapsed');
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Nav Tabs — always pinned at the bottom of the pill */}
          <div
            className="flex-shrink-0 border-t border-border/60 flex items-center gap-1 px-2 bg-card/90"
            style={{ height: NAV_H, borderRadius: '0 0 30px 30px' }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = location.startsWith(item.path);
              const Icon = item.icon;
              return (
                // Press wrapper — framer-motion whileTap gives a spring-driven
                // scale-down that releases smoothly. The CSS :active pseudo-class
                // only snaps the transform on tap so it always felt a beat late.
                <motion.div
                  key={item.path}
                  className="min-w-0 flex-1 h-full"
                  whileTap={{ scale: 0.94 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 28, mass: 0.7 }}
                >
                  <Link
                    href={item.path}
                    onClick={() => haptic(HAPTIC.tap)}
                    aria-label={item.name}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group relative flex flex-col items-center justify-center w-full h-[calc(100%-0.5rem)] gap-1 rounded-2xl transition-[background-color,color,box-shadow] duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted/60 ${
                      isActive ? 'bg-primary/10 shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.12),0_2px_8px_-4px_hsl(var(--primary)/0.5)]' : ''
                    }`}
                  >
                    {/* Icon halo — colored circle behind the icon, springs in/out when active. */}
                    <div className="relative flex items-center justify-center w-11 h-7">
                      <motion.span
                        aria-hidden
                        className="absolute inset-0 rounded-full bg-primary/18"
                        initial={false}
                        animate={{ scale: isActive ? 1 : 0.4, opacity: isActive ? 1 : 0 }}
                        transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.6 }}
                      />
                      <Icon
                        size={21}
                        strokeWidth={isActive ? 2.4 : 1.9}
                        className={`relative transition-colors duration-200 ${
                          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                        }`}
                      />
                    </div>
                    <span
                      className={`text-[10px] sm:text-[11px] font-semibold tracking-[0.01em] leading-none transition-colors duration-200 ${
                        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    >
                      {item.name}
                    </span>
                    {/* Active indicator dot — small pill under the label, springs in. */}
                    <motion.span
                      aria-hidden
                      className="absolute bottom-0 h-[3px] rounded-full bg-primary"
                      initial={false}
                      animate={{ width: isActive ? 16 : 0, opacity: isActive ? 1 : 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 26, mass: 0.6 }}
                    />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Voice AI — deliberately outside the drawer so it floats above the
          bottom navigation and remains easy to reach while the note form is open. */}
      {isOpen && location.startsWith('/catatan') && (
        <motion.div
          className="fixed right-4 z-[60] sm:right-6"
          style={{ bottom: voiceButtonBottom }}
        >
          <VoiceRecordButton
            onTranscript={handleVoiceTranscript}
            className="flex-row-reverse rounded-full border border-border/60 bg-card/95 py-1 pl-2 pr-1 shadow-elevation-2 backdrop-blur-xl"
          />
        </motion.div>
      )}
    </div>
  );
}
