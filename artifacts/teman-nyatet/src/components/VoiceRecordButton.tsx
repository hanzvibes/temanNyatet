import React, { useEffect, useRef } from 'react';
import { Mic, Loader2, Check, AlertCircle, MicOff } from 'lucide-react';
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

function statusLabel(status: RecorderStatus, errorCode: string | null): string {
  switch (status) {
    case 'idle':                  return 'Tahan untuk merekam suara';
    case 'requesting_permission': return 'Meminta izin mikrofon…';
    case 'recording':             return 'Lepaskan untuk berhenti';
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
    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 select-none touch-none';
  switch (status) {
    case 'recording':
      return `${base} bg-red-500 text-white shadow-lg scale-110 focus-visible:ring-red-500`;
    case 'processing':
      return `${base} bg-primary/15 text-primary cursor-wait`;
    case 'done':
      return `${base} bg-green-500/15 text-green-600 dark:text-green-400`;
    case 'error':
      return `${base} bg-destructive/10 text-destructive`;
    default:
      return `${base} bg-primary/10 text-primary hover:bg-primary/18 active:scale-95`;
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

  // ── Press & hold handlers ──────────────────────────────────────────────────
  // We use Pointer events so a single handler covers mouse + touch + stylus.

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isDisabled) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (status === 'idle' || status === 'error' || status === 'done') {
      // A new recording must always be deliverable, even if the previous
      // "done" state is still visible.
      deliveredRef.current = false;
      startRecording();
    }
  };

  const handlePointerUp = () => {
    if (isActive) stopRecording();
  };

  const handlePointerCancel = () => {
    if (isActive) stopRecording();
  };

  const label = statusLabel(status, errorCode);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* The button itself */}
      <button
        type="button"
        aria-label={label}
        aria-pressed={isActive}
        disabled={isDisabled && status !== 'processing'}
        className={buttonClasses(status)}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        // Prevent long-press context menu on mobile
        onContextMenu={(e) => e.preventDefault()}
      >
        {isActive && <RecordingRipple />}
        <span className="relative z-10">
          <ButtonIcon status={status} />
        </span>
      </button>

      {/* Status label */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status + (errorCode ?? '')}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -3 }}
          transition={{ duration: 0.15 }}
          className={[
            'text-xs font-semibold leading-snug',
            status === 'recording'
              ? 'text-red-500 dark:text-red-400'
              : status === 'done'
                ? 'text-green-600 dark:text-green-400'
                : status === 'error'
                  ? 'text-destructive'
                  : 'text-muted-foreground',
          ].join(' ')}
          aria-live="polite"
          aria-atomic="true"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
