import { Router } from 'express';
import { requireAuth, userRateLimit } from '../middleware/requireAuth.js';
import { createRow, deleteRow, listByUser, reorderRows, updateRow } from '../lib/sheet-store.js';
import { SheetsAccessError } from '../lib/google-sheets.js';
import { optionalString, optionalTags, requireString, ValidationError } from '../lib/validate.js';

const router = Router();
const SHEET = '📝 Notes';
const TITLE_MAX = 200;
const CONTENT_MAX = 50_000;
const SUMMARY_CONTENT_MAX = 50_000;
const OPENAI_MODEL = 'gpt-4o-mini';
const OPENAI_TIMEOUT_MS = 30_000;

router.get('/notes', requireAuth, userRateLimit, async (req, res) => {
  try {
    const rows = await listByUser(req.spreadsheetId!, SHEET, req.userId!, req.sheetsClient!);
    rows.sort((a, b) => {
      const posA = Number(a.position) || 0;
      const posB = Number(b.position) || 0;
      if (posA !== posB) return posB - posA;
      return new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime();
    });
    res.status(200).json({ data: rows });
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
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
    const row = await createRow(req.spreadsheetId!, SHEET, req.userId!, { title, content, tags, color }, req.sheetsClient!);
    res.status(201).json({ data: row });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
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
    const row = await updateRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, updates, req.sheetsClient!);
    if (!row) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: row });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
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

    const rows = await listByUser(req.spreadsheetId!, SHEET, req.userId!, req.sheetsClient!);
    const note = rows.find((row) => row.id === req.params.id);
    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const content = requireString(note.content, 'content', SUMMARY_CONTENT_MAX);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let providerResponse: Response;
    try {
      providerResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
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
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!providerResponse.ok) {
      req.log.warn({ status: providerResponse.status }, 'OpenAI summarization request failed');
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

    res.status(200).json({ data: { summary: summary.trim() } });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof Error && err.name === 'AbortError') {
      res.status(504).json({ error: 'AI summary request timed out' });
      return;
    }
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
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
    await reorderRows(req.spreadsheetId!, SHEET, req.userId!, orderedIds, req.sheetsClient!);
    res.status(204).send();
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to reorder notes');
    res.status(500).json({ error: 'Failed to reorder notes' });
  }
});

router.delete('/notes/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const ok = await deleteRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, req.sheetsClient!);
    if (!ok) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to delete note');
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
