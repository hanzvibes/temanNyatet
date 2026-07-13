import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { createRow, deleteRow, listByUser, updateRow } from '../lib/sheet-store';

const router = Router();
const SHEET = 'Links';

router.get('/links', requireAuth, async (req, res) => {
  try {
    const rows = await listByUser(req.spreadsheetId!, SHEET, req.userId!);
    res.status(200).json({ data: rows });
  } catch (err) {
    req.log.error({ err }, 'Failed to list links');
    res.status(500).json({ error: 'Failed to load links' });
  }
});

router.post('/links', requireAuth, async (req, res) => {
  try {
    const { title, url, note } = req.body ?? {};
    if (!title || !url) {
      res.status(400).json({ error: 'title and url are required' });
      return;
    }
    const row = await createRow(req.spreadsheetId!, SHEET, req.userId!, {
      title,
      url,
      note: note ?? null,
    });
    res.status(201).json({ data: row });
  } catch (err) {
    req.log.error({ err }, 'Failed to create link');
    res.status(500).json({ error: 'Failed to create link' });
  }
});

router.put('/links/:id', requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {};
    for (const key of ['title', 'url', 'note']) {
      if (key in (req.body ?? {})) updates[key] = req.body[key];
    }
    const row = await updateRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, updates);
    if (!row) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    res.status(200).json({ data: row });
  } catch (err) {
    req.log.error({ err }, 'Failed to update link');
    res.status(500).json({ error: 'Failed to update link' });
  }
});

router.delete('/links/:id', requireAuth, async (req, res) => {
  try {
    const ok = await deleteRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!);
    if (!ok) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, 'Failed to delete link');
    res.status(500).json({ error: 'Failed to delete link' });
  }
});

export default router;
