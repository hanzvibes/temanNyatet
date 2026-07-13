import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { createRow, deleteRow, listAll, updateRow } from '../lib/sheet-store';

const router = Router();
const SHEET = 'Todos';

router.get('/todos', requireAuth, async (req, res) => {
  try {
    const rows = await listAll(req.spreadsheetId!, SHEET);
    res.status(200).json({ data: rows });
  } catch (err) {
    req.log.error({ err }, 'Failed to list todos');
    res.status(500).json({ error: 'Failed to load todos' });
  }
});

router.post('/todos', requireAuth, async (req, res) => {
  try {
    const { title, description, due_date, due_time, is_done } = req.body ?? {};
    if (!title) {
      res.status(400).json({ error: 'title is required' });
      return;
    }
    const row = await createRow(req.spreadsheetId!, SHEET, req.userId!, {
      title,
      description: description ?? null,
      due_date: due_date ?? null,
      due_time: due_time ?? null,
      is_done: is_done ?? false,
    });
    res.status(201).json({ data: row });
  } catch (err) {
    req.log.error({ err }, 'Failed to create todo');
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

router.put('/todos/:id', requireAuth, async (req, res) => {
  try {
    const updates: Record<string, unknown> = {};
    for (const key of ['title', 'description', 'due_date', 'due_time', 'is_done']) {
      if (key in (req.body ?? {})) updates[key] = req.body[key];
    }
    const row = await updateRow(req.spreadsheetId!, SHEET, req.params.id as string, updates);
    if (!row) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.status(200).json({ data: row });
  } catch (err) {
    req.log.error({ err }, 'Failed to update todo');
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

router.delete('/todos/:id', requireAuth, async (req, res) => {
  try {
    const ok = await deleteRow(req.spreadsheetId!, SHEET, req.params.id as string);
    if (!ok) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, 'Failed to delete todo');
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

export default router;
