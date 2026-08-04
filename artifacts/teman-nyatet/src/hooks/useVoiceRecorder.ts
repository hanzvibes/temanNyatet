import { useState, useRef, useCallback } from 'react';
import { apiUpload } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecorderStatus =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'processing'
  | 'done'
  | 'error';

export type RecorderErrorCode =
  | 'not_supported'      // MediaRecorder / getUserMedia unavailable
  | 'permission_denied'  // User denied mic access
  | 'too_short'          // Recording released before MIN_RECORDING_MS
  | 'no_speech'          // API returned 422 — silent audio
  | 'transcription_failed'; // Any other API / network failure

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum hold duration before we treat the audio as intentional. */
const MIN_RECORDING_MS = 600;

/**
 * Ordered list of MIME types to try for MediaRecorder.
 * We prefer opus-in-webm (smallest, wide browser support), then plain webm,
 * then ogg, and fall back to the browser default if nothing matches.
 */
const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  for (const type of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseVoiceRecorderReturn {
  status: RecorderStatus;
  transcript: string;
  errorCode: RecorderErrorCode | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  reset: () => void;
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [errorCode, setErrorCode] = useState<RecorderErrorCode | null>(null);

  const recorderRef  = useRef<MediaRecorder | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  /** Stop all mic tracks and release the stream. */
  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    // Guard: browser support
    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      setStatus('error');
      setErrorCode('not_supported');
      return;
    }

    setStatus('requesting_permission');
    setErrorCode(null);
    setTranscript('');

    // Request microphone access
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch {
      setStatus('error');
      setErrorCode('permission_denied');
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      releaseStream();

      const elapsed = Date.now() - startTimeRef.current;
      if (elapsed < MIN_RECORDING_MS) {
        setStatus('error');
        setErrorCode('too_short');
        return;
      }

      setStatus('processing');

      const finalMime = recorder.mimeType || mimeType || 'audio/webm';
      const blob = new Blob(chunksRef.current, { type: finalMime });

      // Pick a file extension the server / Whisper can recognise
      const ext = finalMime.includes('ogg')
        ? 'ogg'
        : finalMime.includes('mp4') || finalMime.includes('m4a')
          ? 'mp4'
          : 'webm';

      const formData = new FormData();
      formData.append('audio', blob, `recording.${ext}`);

      try {
        const result = await apiUpload<{ transcript: string }>('/transcribe', formData);
        setTranscript(result.transcript);
        setStatus('done');
        // Short haptic pulse on success (mobile)
        if (navigator.vibrate) navigator.vibrate(10);
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('No speech') || msg.includes('422')) {
          setErrorCode('no_speech');
        } else {
          setErrorCode('transcription_failed');
        }
        setStatus('error');
      }
    };

    recorder.start();
    startTimeRef.current = Date.now();
    setStatus('recording');
  }, [releaseStream]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    } else {
      // Recording never started (e.g. permission pending) — clean up
      releaseStream();
      setStatus('idle');
    }
  }, [releaseStream]);

  const reset = useCallback(() => {
    setStatus('idle');
    setTranscript('');
    setErrorCode(null);
  }, []);

  return { status, transcript, errorCode, startRecording, stopRecording, reset };
}
