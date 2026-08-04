import { Router, type IRouter } from 'express';
import * as multerMod from 'multer';
import { requireAuth, userRateLimit } from '../middleware/requireAuth.js';

// multer ships CJS UMD types alongside an ESM default-export shim — same
// pattern used in profile.ts.
const multer = ((multerMod as any).default ?? multerMod) as any;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB — OpenAI Whisper hard limit
  fileFilter(_req: any, file: any, cb: any) {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are accepted'));
    }
  },
});

const router: IRouter = Router();

// Whisper transcription always targets the official OpenAI API endpoint unless
// a dedicated WHISPER_BASE_URL is configured.  The project's OPENAI_BASE_URL
// may point to a chat-only proxy (e.g. SumoPod) that doesn't expose
// /v1/audio/transcriptions, so we intentionally do NOT fall back to it.
const WHISPER_BASE_URL = (
  process.env['WHISPER_BASE_URL'] ?? 'https://api.openai.com'
).replace(/\/+$/, '');
const OPENAI_API_KEY = process.env['OPENAI_API_KEY'];
const TRANSCRIBE_TIMEOUT_MS = 30_000;

/**
 * POST /transcribe
 *
 * Accepts a multipart/form-data request with a single `audio` field
 * (any browser-native audio format: webm, ogg, mp4, etc.).  Pipes the
 * audio to the OpenAI Whisper transcription API and returns the transcript.
 *
 * Response: { data: { transcript: string } }
 */
router.post(
  '/transcribe',
  requireAuth,
  userRateLimit,
  (req, res, next) => {
    // Run multer as a middleware so we can return typed JSON errors instead
    // of letting Express's default error handler produce HTML.
    upload.single('audio')(req, res, (err: any) => {
      if (!err) return next();
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          res.status(413).json({ error: 'Audio file too large (max 25 MB)' });
          return;
        }
        res.status(400).json({ error: `Upload error: ${err.message}` });
        return;
      }
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    });
  },
  async (req, res) => {
    try {
      const file = (req as any).file as
        | { buffer: Buffer; mimetype: string; size: number }
        | undefined;

      if (!file) {
        res.status(400).json({ error: 'Audio file is required (field name: audio)' });
        return;
      }

      if (!OPENAI_API_KEY) {
        req.log.warn('OPENAI_API_KEY not set — transcription unavailable');
        res.status(503).json({ error: 'Transcription service not configured' });
        return;
      }

      // Determine file extension from MIME type so Whisper can parse the audio.
      const ext = file.mimetype.includes('ogg')
        ? 'ogg'
        : file.mimetype.includes('mp4') || file.mimetype.includes('m4a')
          ? 'mp4'
          : file.mimetype.includes('mpeg') || file.mimetype.includes('mp3')
            ? 'mp3'
            : 'webm';

      const formData = new FormData();
      // Convert Node.js Buffer → ArrayBuffer so the Web Blob constructor is happy
      const arrayBuffer = file.buffer.buffer.slice(
        file.buffer.byteOffset,
        file.buffer.byteOffset + file.buffer.byteLength,
      ) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: file.mimetype });
      formData.append('file', blob, `recording.${ext}`);
      formData.append('model', 'whisper-1');
      // Provide language hint — the app is Indonesian-first; Whisper will still
      // handle code-switching gracefully when the user mixes languages.
      formData.append('language', 'id');

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TRANSCRIBE_TIMEOUT_MS);

      let providerResponse: Response;
      try {
        providerResponse = await fetch(`${WHISPER_BASE_URL}/v1/audio/transcriptions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
          body: formData,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!providerResponse.ok) {
        const errorText = await providerResponse.text().catch(() => '');
        req.log.warn(
          {
            status: providerResponse.status,
            provider: WHISPER_BASE_URL,
            body: errorText.slice(0, 500),
          },
          'Whisper API returned non-OK status',
        );
        res.status(502).json({ error: 'Transcription failed — provider error' });
        return;
      }

      const body = (await providerResponse.json()) as { text?: string };
      const transcript = body.text?.trim() ?? '';

      if (!transcript) {
        res.status(422).json({ error: 'No speech detected in the recording' });
        return;
      }

      res.status(200).json({ data: { transcript } });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        res.status(504).json({ error: 'Transcription request timed out' });
        return;
      }
      req.log.error({ err }, 'Failed to transcribe audio');
      res.status(500).json({ error: 'Transcription failed' });
    }
  },
);

export default router;
