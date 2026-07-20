import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { createRow, deleteRow, listByUser, updateRow } from '../lib/sheet-store';
import { SheetsAccessError } from '../lib/google-sheets';
import { optionalString, optionalTags, requireString, ValidationError } from '../lib/validate';

const router = Router();
const SHEET = '📝 Notes';
const TITLE_MAX = 200;
const CONTENT_MAX = 50_000;

router.get('/notes', requireAuth, async (req, res) => {
  try {
    const rows = await listByUser(req.spreadsheetId!, SHEET, req.userId!, req.sheetsClient!);
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

router.post('/notes', requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const content = requireString(body.content, 'content', CONTENT_MAX);
    const title = optionalString(body.title, 'title', TITLE_MAX);
    const tags = optionalTags(body.tags);
    const row = await createRow(req.spreadsheetId!, SHEET, req.userId!, { title, content, tags }, req.sheetsClient!);
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

router.put('/notes/:id', requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if ('title' in body) updates.title = optionalString(body.title, 'title', TITLE_MAX);
    if ('content' in body) updates.content = requireString(body.content, 'content', CONTENT_MAX);
    if ('tags' in body) updates.tags = optionalTags(body.tags);
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

router.delete('/notes/:id', requireAuth, async (req, res) => {
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
