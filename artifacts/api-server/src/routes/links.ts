import { Router } from 'express';
import { requireAuth, userRateLimit } from '../middleware/requireAuth';
import { createRow, deleteRow, listByUser, updateRow } from '../lib/sheet-store';
import { SheetsAccessError } from '../lib/google-sheets';
import { optionalString, requireHttpUrl, requireString, ValidationError } from '../lib/validate';

const router = Router();
const SHEET = '🔗 Links';
const TITLE_MAX = 200;
const NOTE_MAX = 5_000;

router.get('/links', requireAuth, userRateLimit, async (req, res) => {
  try {
    const rows = await listByUser(req.spreadsheetId!, SHEET, req.userId!, req.sheetsClient!);
    res.status(200).json({ data: rows });
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to list links');
    res.status(500).json({ error: 'Failed to load links' });
  }
});

router.post('/links', requireAuth, userRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const title = requireString(body.title, 'title', TITLE_MAX);
    const url = requireHttpUrl(body.url, 'url');
    const note = optionalString(body.note, 'note', NOTE_MAX);
    const row = await createRow(req.spreadsheetId!, SHEET, req.userId!, { title, url, note }, req.sheetsClient!);
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
    req.log.error({ err }, 'Failed to create link');
    res.status(500).json({ error: 'Failed to create link' });
  }
});

router.put('/links/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if ('title' in body) updates.title = requireString(body.title, 'title', TITLE_MAX);
    if ('url' in body) updates.url = requireHttpUrl(body.url, 'url');
    if ('note' in body) updates.note = optionalString(body.note, 'note', NOTE_MAX);
    const row = await updateRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, updates, req.sheetsClient!);
    if (!row) {
      res.status(404).json({ error: 'Link not found' });
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
    req.log.error({ err }, 'Failed to update link');
    res.status(500).json({ error: 'Failed to update link' });
  }
});

router.delete('/links/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const ok = await deleteRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, req.sheetsClient!);
    if (!ok) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to delete link');
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

export default router;
