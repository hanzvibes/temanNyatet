import { Router, type IRouter } from 'express';
import { requireAuth, userRateLimit } from '../middleware/requireAuth.js';
import { createData, deleteData, listData, reorderNotes, updateData } from '../lib/data-store.js';
import {
  optionalString,
  optionalTags,
  requireNonEmptyUpdates,
  requireString,
  ValidationError,
} from '../lib/validate.js';
import { consumeCredit, CreditsExhaustedError, getCreditBalance } from '../lib/credit-service.js';
import { syncNoteLinks } from '../lib/note-link-sync.js';

const router: IRouter = Router();
const TITLE_MAX = 200;
const CONTENT_MAX = 50_000;
const SUMMARY_CONTENT_MAX = 50_000;
const AI_BASE_URL = (process.env['OPENAI_BASE_URL'] ?? 'https://ai.sumopod.com').replace(/\/+$/, '');
const AI_MODEL = process.env['OPENAI_MODEL'] ?? 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = 30_000;

router.get('/notes', requireAuth, userRateLimit, async (req, res) => {
  try {
    const rows = await listData('notes', req.userId!);
    rows.sort((a, b) => {
      const posA = Number(a.position) || 0;
      const posB = Number(b.position) || 0;
      if (posA !== posB) return posB - posA;
      return new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime();
    });
    res.status(200).json({ data: rows });
  } catch (err) {
    req.log.error({ err }, 'Failed to list notes');
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

router.post('/notes', requireAuth, userRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const content = requireString(body.content, 'content', CONTENT_MAX);
    const title = optionalString(body.title, 'title', TITLE_MAX);
    const tags = optionalTags(body.tags);
    const color = optionalString(body.color, 'color', 100);
    const row = await createData('notes', req.userId!, { title, content, tags, color });
    res.status(201).json({ data: row });
    void syncNoteLinks(req.userId!, title, content, req.log).catch((syncError) => {
      req.log.warn({ err: syncError }, 'Automatic note link sync failed');
    });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to create note');
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/notes/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if ('title' in body) updates.title = optionalString(body.title, 'title', TITLE_MAX);
    if ('content' in body) updates.content = requireString(body.content, 'content', CONTENT_MAX);
    if ('tags' in body) updates.tags = optionalTags(body.tags);
    if ('color' in body) updates.color = optionalString(body.color, 'color', 100);
    requireNonEmptyUpdates(updates, 'updates');
    const row = await updateData('notes', req.params.id as string, req.userId!, updates);
    if (!row) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: row });
    if ('title' in updates || 'content' in updates) {
      void syncNoteLinks(req.userId!, updates.title ?? row.title, updates.content ?? row.content, req.log).catch((syncError) => {
        req.log.warn({ err: syncError }, 'Automatic note link sync failed');
      });
    }
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to update note');
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.post('/notes/:id/summarize', requireAuth, userRateLimit, async (req, res) => {
  try {
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      res.status(503).json({ error: 'AI summarization is not configured' });
      return;
    }

    const currentBalance = await getCreditBalance(req.userId!);
    if (currentBalance <= 0) {
      res.status(402).json({ error: 'CREDITS_EXHAUSTED', balance: 0 });
      return;
    }

    const rows = await listData('notes', req.userId!);
    const note = rows.find((row) => row.id === req.params.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const content = requireString(note.content, 'content', SUMMARY_CONTENT_MAX);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const providerResponse = await fetch(`${AI_BASE_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: AI_MODEL,
        temperature: 0.2,
        max_tokens: 180,
        messages: [
          {
            role: 'system',
            content:
              'Anda adalah asisten peringkas catatan. Ringkas catatan dalam bahasa Indonesia menjadi 2–3 kalimat yang singkat dan jelas. Jangan menambahkan informasi yang tidak ada di catatan. Kembalikan hanya ringkasannya tanpa judul, bullet, atau pengantar.',
          },
          {
            role: 'user',
            content: `Catatan yang harus diringkas:\n\n${content}`,
          },
        ],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!providerResponse.ok) {
      const providerError = await providerResponse.text().catch(() => '');
      req.log.warn(
        {
          status: providerResponse.status,
          provider: AI_BASE_URL,
          model: AI_MODEL,
          response: providerError.slice(0, 500),
        },
        'AI summarization provider request failed',
      );
      res.status(502).json({ error: 'AI summary could not be generated' });
      return;
    }

    const providerBody = (await providerResponse.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const summary = providerBody.choices?.[0]?.message?.content;
    if (typeof summary !== 'string' || !summary.trim()) {
      req.log.warn('OpenAI returned an empty summary');
      res.status(502).json({ error: 'AI summary returned no usable content' });
      return;
    }

    let balance: number;
    try {
      balance = await consumeCredit(req.userId!, 'ai_summary');
    } catch (err) {
      if (err instanceof CreditsExhaustedError) {
        res.status(402).json({ error: 'CREDITS_EXHAUSTED', balance: 0 });
        return;
      }
      throw err;
    }
    res.status(200).json({ data: { summary: summary.trim(), balance } });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      res.status(504).json({ error: 'AI summary request timed out' });
      return;
    }
    req.log.error({ err }, 'Failed to summarize note');
    res.status(500).json({ error: 'Failed to generate AI summary' });
  }
});


router.post('/notes/reorder', requireAuth, userRateLimit, async (req, res) => {
  try {
    const orderedIds = req.body?.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.some((id) => typeof id !== 'string')) {
      res.status(400).json({ error: 'orderedIds must be an array of strings' });
      return;
    }
    await reorderNotes(req.userId!, orderedIds);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, 'Failed to reorder notes');
    res.status(500).json({ error: 'Failed to reorder notes' });
  }
});

router.delete('/notes/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const ok = await deleteData('notes', req.params.id as string, req.userId!);
    if (!ok) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, 'Failed to delete note');
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
