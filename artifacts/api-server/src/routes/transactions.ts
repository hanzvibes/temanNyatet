import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { createRow, deleteRow, listByUser } from '../lib/sheet-store';

const router = Router();
const SHEET = 'Transactions';

router.get('/transactions', requireAuth, async (req, res) => {
  try {
    const rows = await listByUser(SHEET, req.userId!);
    res.status(200).json({ data: rows });
  } catch (err) {
    req.log.error({ err }, 'Failed to list transactions');
    res.status(500).json({ error: 'Failed to load transactions' });
  }
});

router.post('/transactions', requireAuth, async (req, res) => {
  try {
    const { type, amount, category, source, note, date } = req.body ?? {};
    if (!type || !amount || !category || !source || !date) {
      res.status(400).json({ error: 'type, amount, category, source, and date are required' });
      return;
    }
    const row = await createRow(SHEET, req.userId!, { type, amount, category, source, note: note ?? null, date });
    res.status(201).json({ data: row });
  } catch (err) {
    req.log.error({ err }, 'Failed to create transaction');
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

router.delete('/transactions/:id', requireAuth, async (req, res) => {
  try {
    const ok = await deleteRow(SHEET, req.params.id as string, req.userId!);
    if (!ok) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, 'Failed to delete transaction');
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

export default router;
