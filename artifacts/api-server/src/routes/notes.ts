import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { createRow, deleteRow, listByUser, updateRow } from '../lib/sheet-store';

const router = Router();
const SHEET = 'Notes';

router.get('/notes', requireAuth, async (req, res) => {
  try {
    const rows = await listByUser(req.spreadsheetId!, SHEET, req.userId!);
    res.status(200).json({ data: rows });
  } catch (err) {
    req.log.error({ err }, 'Failed to list notes');
    res.status(500).json({ error: 'Failed to load notes' });
  }
});

router.post('/notes', requireAuth, async (req, res) => {
  try {
    const { title, content, tags } = req.body ?? {};
    if (!content || typeof content !== 'string' || !content.trim()) {
      res.status(400).json({ error: 'content is required and must be a non-empty string' });
      return;
    }
    const row = await createRow(req.spreadsheetId!, SHEET, req.userId!, {
      title: title ?? null,
      content: content.trim(),
      tags: Array.isArray(tags) ? tags : [],
    });
    res.status(201).json({ data: row });
  } catch (err) {
    req.log.error({ err }, 'Failed to create note');
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.put('/notes/:id', requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {};
    for (const key of ['title', 'content', 'tags']) {
      if (key in (req.body ?? {})) updates[key] = req.body[key];
    }
    const row = await updateRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, updates);
    if (!row) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }
    res.status(200).json({ data: row });
  } catch (err) {
    req.log.error({ err }, 'Failed to update note');
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/notes/:id', requireAuth, async (req, res) => {
  try {
    const ok = await deleteRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!);
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
