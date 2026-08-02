import { Router, type IRouter } from 'express';
import { requireAuth, userRateLimit } from '../middleware/requireAuth.js';
import { createData, deleteData, listData, updateData } from '../lib/data-store.js';
import {
  optionalString,
  requireHttpUrl,
  requireNonEmptyUpdates,
  requireString,
  ValidationError,
} from '../lib/validate.js';

const router: IRouter = Router();
const TITLE_MAX = 200;
const NOTE_MAX = 5_000;

router.get('/links', requireAuth, userRateLimit, async (req, res) => {
  try {
    const rows = await listData('links', req.userId!);
    res.status(200).json({ data: rows });
  } catch (err) {
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
    const row = await createData('links', req.userId!, { title, url, note });
    res.status(201).json({ data: row });
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).json({ error: err.message });
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
    requireNonEmptyUpdates(updates, 'updates');
    const row = await updateData('links', req.params.id as string, req.userId!, updates);
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
    req.log.error({ err }, 'Failed to update link');
    res.status(500).json({ error: 'Failed to update link' });
  }
});

router.delete('/links/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const ok = await deleteData('links', req.params.id as string, req.userId!);
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
