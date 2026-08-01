import { Router, type IRouter } from 'express';
import { requireUser } from '../middleware/requireAuth.js';
import { getCreditBalance } from '../lib/credit-service.js';

const router: IRouter = Router();

router.get('/credits', requireUser, async (req, res) => {
  try {
    const balance = await getCreditBalance(req.userId!);
    res.status(200).json({ data: { balance } });
  } catch (err) {
    req.log.error({ err, userId: req.userId }, 'Failed to load credit balance');
    res.status(503).json({ error: 'Credits are temporarily unavailable' });
  }
});

export default router;