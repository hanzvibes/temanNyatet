import { Router } from 'express';
import crypto from 'crypto';
import { archiveExpiredAccounts } from '../lib/supabase-admin.js';

const router = Router();

// Constant-time secret comparison using HMAC to normalize to fixed-length digests.
// This prevents timing attacks even when secrets differ in length.
function timingSafeEqual(provided: string, expected: string): boolean {
  const hmacKey = crypto.randomBytes(32);
  const a = crypto.createHmac('sha256', hmacKey).update(provided).digest();
  const b = crypto.createHmac('sha256', hmacKey).update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

// POST /api/cron/archive-expired
// Called daily to archive accounts whose subscription_end has passed.
// Protected by CRON_SECRET bearer token. Fails closed if the secret is not set.
router.post('/cron/archive-expired', async (req, res) => {
  const cronSecret = process.env['CRON_SECRET'];

  // Fail closed: endpoint is disabled when CRON_SECRET is not configured
  if (!cronSecret) {
    req.log.error('CRON_SECRET is not set — cron endpoint is disabled for safety');
    res.status(503).json({ error: 'Cron endpoint not configured' });
    return;
  }

  const authHeader = String(req.headers['authorization'] ?? '');
  const providedSecret = authHeader.replace(/^Bearer\s+/i, '');

  if (!providedSecret || !timingSafeEqual(providedSecret, cronSecret)) {
    req.log.warn('Unauthorized cron request — invalid or missing bearer token');
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.log.info('Running archive-expired cron job');

  try {
    const result = await archiveExpiredAccounts();

    if (result.error) {
      req.log.error({ error: result.error }, 'Cron archive-expired failed');
      res.status(500).json({ error: result.error });
      return;
    }

    req.log.info({ archived_count: result.count }, 'Cron archive-expired completed');
    res.status(200).json({
      archived_count: result.count,
      message: `Archived ${result.count} expired account(s)`,
    });
  } catch (err) {
    req.log.error({ err }, 'Unexpected error in /cron/archive-expired');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
