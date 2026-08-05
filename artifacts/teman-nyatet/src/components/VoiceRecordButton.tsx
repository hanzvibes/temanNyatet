import React, { useEffect, useRef, useState } from 'react';
import { Mic, Loader2, Check, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceRecorder, type RecorderStatus } from '@/hooks/useVoiceRecorder';

// ─── Types ────────────────────────────────────────────────────────────────────

interface VoiceRecordButtonProps {
  /** Called with the transcribed text once it's ready. */
  onTranscript: (text: string) => void;
  /** Disables the button (e.g. while the parent form is submitting). */
  disabled?: boolean;
  className?: string;
}

// ─── Status copy ─────────────────────────────────────────────────────────────

function statusLabel(status: RecorderStatus, errorCode: string | null, elapsedSeconds: number): string {
  switch (status) {
    case 'idle':                  return 'Tahan untuk merekam suara';
    case 'requesting_permission': return 'Meminta izin mikrofon…';
    case 'recording':             return `Merekam ${formatElapsed(elapsedSeconds)} · lepaskan untuk berhenti`;
    case 'processing':            return 'Memproses audio…';
    case 'done':                  return 'Transkripsi selesai';
    case 'error':
      switch (errorCode) {
        case 'not_supported':        return 'Browser tidak mendukung rekam suara';
        case 'permission_denied':    return 'Izin mikrofon ditolak';
        case 'too_short':            return 'Rekaman terlalu singkat — tahan lebih lama';
        case 'no_speech':            return 'Tidak ada suara terdeteksi';
        case 'transcription_failed': return 'Transkripsi gagal — coba lagi';
        default:                     return 'Terjadi kesalahan';
      }
    default: return '';
  }
}

function formatElapsed(seconds: number): string {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
  const remainder = (seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

// ─── Ripple animation for "recording" state ───────────────────────────────────

function RecordingRipple() {
  return (
    <>
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          className="absolute inset-0 rounded-full bg-red-500/30"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{
            duration: 1.4,
            repeat: Infinity,
            delay: i * 0.7,
            ease: 'easeOut',
          }}
        />
      ))}
    </>
  );
}

function RecordingBars() {
  return (
    <span className="absolute inset-x-2 bottom-[-0.65rem] z-20 flex h-3 items-end justify-center gap-0.5" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((bar) => (
        <motion.span
          key={bar}
          className="w-0.5 rounded-full bg-red-500"
          animate={{ height: ['35%', '100%', '55%', '85%', '35%'] }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: bar * 0.11,
            ease: 'easeInOut',
          }}
        />
      ))}
    </span>
  );
}

// ─── Icon inside the button ───────────────────────────────────────────────────

function ButtonIcon({ status }: { status: RecorderStatus }) {
  switch (status) {
    case 'requesting_permission':
    case 'processing':
      return <Loader2 size={20} className="animate-spin" />;
    case 'done':
      return <Check size={20} strokeWidth={2.5} />;
    case 'error':
      return <MicOff size={20} strokeWidth={2} />;
    default:
      return <Mic size={20} strokeWidth={2} />;
  }
}

// ─── Button colour per state ──────────────────────────────────────────────────

function buttonClasses(status: RecorderStatus): string {
  const base =
    'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none touch-none';
  switch (status) {
    case 'recording':
      return `${base} border-red-400/70 bg-red-500 text-white shadow-[0_8px_24px_rgba(239,68,68,0.35)] scale-110 focus-visible:ring-red-500`;
    case 'processing':
      return `${base} border-primary/20 bg-primary/10 text-primary cursor-wait`;
    case 'done':
      return `${base} border-green-500/20 bg-green-500/15 text-green-600 dark:text-green-400`;
    case 'error':
      return `${base} border-destructive/20 bg-destructive/10 text-destructive`;
    default:
      return `${base} border-primary/15 bg-primary/10 text-primary shadow-sm hover:border-primary/25 hover:bg-primary/15 hover:shadow-md active:scale-95`;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VoiceRecordButton({
  onTranscript,
  disabled = false,
  className = '',
}: VoiceRecordButtonProps) {
  const { status, transcript, errorCode, startRecording, stopRecording, reset } =
    useVoiceRecorder();
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const keyboardPressedRef = useRef(false);
  const pressActiveRef = useRef(false);

  // Keep the latest parent callback without making the delivery effect restart
  // every time the parent page re-renders after form.setValue().
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  // Deliver transcript to parent exactly once when done
  const deliveredRef = useRef(false);
  useEffect(() => {
    if (!(status === 'done' && transcript && !deliveredRef.current)) return;
    deliveredRef.current = true;
    onTranscriptRef.current(transcript);
    // Auto-reset after a brief "done" flash so the button is ready again
    const t = window.setTimeout(() => {
      reset();
      deliveredRef.current = false;
    }, 1800);
    return () => window.clearTimeout(t);
  }, [status, transcript, reset]);

  // Auto-reset error state after a moment so users can retry
  useEffect(() => {
    if (status !== 'error') return;
    const t = window.setTimeout(() => reset(), 3500);
    return () => window.clearTimeout(t);
  }, [status, reset]);

  const isActive   = status === 'recording';
  const isBusy     = status === 'requesting_permission' || status === 'processing';
  const isDisabled = disabled || isBusy;

  useEffect(() => {
    if (!isActive) {
      setRecordingSeconds(0);
      return;
    }

    const startedAt = Date.now();
    const updateElapsed = () => {
      setRecordingSeconds(Math.floor((Date.now() - startedAt) / 1000));
    };
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(timer);
  }, [isActive]);

  // If the microphone permission prompt appears after pointer-up, stop as
  // soon as recognition actually starts instead of recording unexpectedly.
  useEffect(() => {
    if (status === 'recording' && !pressActiveRef.current) {
      stopRecording();
    }
  }, [status, stopRecording]);

  // ── Press & hold handlers ──────────────────────────────────────────────────
  // We use Pointer events so a single handler covers mouse + touch + stylus.

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDisabled) return;
    pressActiveRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (status === 'idle' || status === 'error' || status === 'done') {
      // A new recording must always be deliverable, even if the previous
      // "done" state is still visible.
      deliveredRef.current = false;
      startRecording();
    }
  };

  const handlePointerUp = () => {
    pressActiveRef.current = false;
    if (isActive) stopRecording();
  };

  const handlePointerCancel = () => {
    pressActiveRef.current = false;
    if (isActive) stopRecording();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key !== ' ' && e.key !== 'Enter') || e.repeat || isDisabled) return;
    e.preventDefault();
    keyboardPressedRef.current = true;
    pressActiveRef.current = true;
    deliveredRef.current = false;
    void startRecording();
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (keyboardPressedRef.current && isActive) stopRecording();
    keyboardPressedRef.current = false;
    pressActiveRef.current = false;
  };

  const handleBlur = () => {
    if (keyboardPressedRef.current && isActive) stopRecording();
    keyboardPressedRef.current = false;
    pressActiveRef.current = false;
  };

  const label = statusLabel(status, errorCode, recordingSeconds);
  const statusTone =
    status === 'recording'
      ? 'text-red-500 dark:text-red-400'
      : status === 'done'
        ? 'text-green-600 dark:text-green-400'
        : status === 'error'
          ? 'text-destructive'
          : 'text-muted-foreground';

  return (
    <div className={`flex max-w-[calc(100vw-2rem)] items-center gap-2.5 ${className}`}>
      {/* The button itself */}
      <button
        type="button"
        aria-label={label}
        aria-pressed={isActive}
        aria-busy={isBusy}
        title={label}
        disabled={isDisabled}
        className={buttonClasses(status)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlur}
        // Prevent long-press context menu on mobile
        onContextMenu={(e) => e.preventDefault()}
      >
        {isActive && <RecordingRipple />}
        {isActive && <RecordingBars />}
        <span className="relative z-10">
          <ButtonIcon status={status} />
        </span>
      </button>

      {/* Status label */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status + (errorCode ?? '')}
          initial={{ opacity: 0, x: 4 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 4 }}
          transition={{ duration: 0.18 }}
          className={`min-w-0 truncate text-xs font-semibold leading-snug ${statusTone}`}
          aria-live="polite"
          aria-atomic="true"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
