import { Router } from 'express';
import { requireAuth, userRateLimit } from '../middleware/requireAuth.js';
import { createRow, deleteRow, listByUser, updateRow } from '../lib/sheet-store.js';
import { SheetsAccessError } from '../lib/google-sheets.js';
import { optionalString, requireEnum, requireString, ValidationError } from '../lib/validate.js';

const router = Router();
const SHEET = '💰 Transactions';
const FIELD_MAX = 200;
const NOTE_MAX = 5_000;
const DATE_MAX = 32;
const TRANSACTION_TYPES = ['income', 'expense'] as const;

function parseAmount(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError('amount must be a positive number');
  }
  return parsed;
}

router.get('/transactions', requireAuth, userRateLimit, async (req, res) => {
  try {
    const rows = await listByUser(req.spreadsheetId!, SHEET, req.userId!, req.sheetsClient!);
    res.status(200).json({ data: rows });
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to list transactions');
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

router.post('/transactions', requireAuth, userRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const type = requireEnum(body.type, 'type', TRANSACTION_TYPES);
    const amount = parseAmount(body.amount);
    const category = requireString(body.category, 'category', FIELD_MAX);
    const source = requireString(body.source, 'source', FIELD_MAX);
    const date = requireString(body.date, 'date', DATE_MAX);
    const note = optionalString(body.note, 'note', NOTE_MAX);
    const row = await createRow(req.spreadsheetId!, SHEET, req.userId!, { type, amount, category, source, note, date }, req.sheetsClient!);
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
    req.log.error({ err }, 'Failed to create transaction');
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

router.put('/transactions/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const body = req.body ?? {};
    const updates: Record<string, unknown> = {};
    if ('type' in body) updates.type = requireEnum(body.type, 'type', TRANSACTION_TYPES);
    if ('amount' in body) updates.amount = parseAmount(body.amount);
    if ('category' in body) updates.category = requireString(body.category, 'category', FIELD_MAX);
    if ('source' in body) updates.source = requireString(body.source, 'source', FIELD_MAX);
    if ('date' in body) updates.date = requireString(body.date, 'date', DATE_MAX);
    if ('note' in body) updates.note = optionalString(body.note, 'note', NOTE_MAX);
    const row = await updateRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, updates, req.sheetsClient!);
    if (!row) {
      res.status(404).json({ error: 'Transaction not found' });
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
    req.log.error({ err }, 'Failed to update transaction');
    res.status(500).json({ error: 'Failed to update transaction' });
  }
});

router.delete('/transactions/:id', requireAuth, userRateLimit, async (req, res) => {
  try {
    const ok = await deleteRow(req.spreadsheetId!, SHEET, req.params.id as string, req.userId!, req.sheetsClient!);
    if (!ok) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    if (err instanceof SheetsAccessError) {
      res.status(503).json({ error: err.code, message: err.message });
      return;
    }
    req.log.error({ err }, 'Failed to delete transaction');
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
