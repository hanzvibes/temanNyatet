import { Router } from 'express';
import { requireAuth, userRateLimit } from '../middleware/requireAuth';
import { createRow, deleteRow, listByUser, updateRow } from '../lib/sheet-store';
import { SheetsAccessError } from '../lib/google-sheets';
import { optionalBoolean, optionalString, requireString, ValidationError } from '../lib/validate';

const router = Router();
const SHEET = '✅ Todos';
const TITLE_MAX = 200;
const DESCRIPTION_MAX = 5_000;
const DATE_MAX = 32;

router.get('/todos', requireAuth, userRateLimit, async (req, res) => {
  try {
    const rows = await listByUser(req.spreadsheetId!, SHEET, req.userId!, req.sheetsClient!);
    res.status(200).json({ data: rows });
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to list todos');
    res.status(500).json({ error: 'Failed to load todos' });
  }
});

router.post('/todos', requireAuth, userRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const title = requireString(body.title, 'title', TITLE_MAX);
    const description = optionalString(body.description, 'description', DESCRIPTION_MAX);
    const due_date = optionalString(body.due_date, 'due_date', DATE_MAX);
    const due_time = optionalString(body.due_time, 'due_time', DATE_MAX);
    const is_done = optionalBoolean(body.is_done, 'is_done');
    const row = await createRow(req.spreadsheetId!, SHEET, req.userId!, { title, description, due_date, due_time, is_done }, req.sheetsClient!);
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
    req.log.error({ err }, 'Failed to create todo');
    res.status(500).json({ error: 'Failed to create todo' });
  }
});

router.put('/todos/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if ('title' in body) updates.title = requireString(body.title, 'title', TITLE_MAX);
    if ('description' in body) updates.description = optionalString(body.description, 'description', DESCRIPTION_MAX);
    if ('due_date' in body) updates.due_date = optionalString(body.due_date, 'due_date', DATE_MAX);
    if ('due_time' in body) updates.due_time = optionalString(body.due_time, 'due_time', DATE_MAX);
    if ('is_done' in body) updates.is_done = optionalBoolean(body.is_done, 'is_done');
    const row = await updateRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, updates, req.sheetsClient!);
    if (!row) {
      res.status(404).json({ error: 'Todo not found' });
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
    req.log.error({ err }, 'Failed to update todo');
    res.status(500).json({ error: 'Failed to update todo' });
  }
});

router.delete('/todos/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const ok = await deleteRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, req.sheetsClient!);
    if (!ok) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to delete todo');
    res.status(500).json({ error: 'Failed to delete todo' });
  }
});

export default router;
