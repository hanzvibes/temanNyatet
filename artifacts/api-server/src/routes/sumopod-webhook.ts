import { Router } from 'express';
import {
  getPaymentOrder,
  markPaymentOrderCompleted,
  markPaymentOrderTerminal,
} from '../lib/payment-orders.js';
import {
  parseSumopodWebhook,
  verifySumopodWebhookSignature,
} from '../lib/sumopod-payment.js';
import { activateSubscription } from '../lib/supabase-admin.js';

const router = Router();

router.post('/sumopod-webhook', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body ?? {}));
  const configuredSecret = process.env['SUMOPOD_WEBHOOK_SECRET']?.trim();
  const signature =
    String(req.headers['x-sumopod-signature'] ?? req.headers['x-signature'] ?? '');

  if (configuredSecret) {
    if (!signature || !verifySumopodWebhookSignature(rawBody, signature, configuredSecret)) {
      req.log.warn('Invalid SumoPod webhook signature');
      res.status(401).json({ error: 'Invalid signature' });
      return;
    }
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.status(400).json({ error: 'Invalid JSON body' });
    return;
  }

  const event = parseSumopodWebhook(payload);
  if (!event) {
    res.status(400).json({ error: 'Unsupported or invalid SumoPod event' });
    return;
  }

  if (event.type !== 'payment.completed') {
    if (event.orderId && (event.type === 'payment.failed' || event.type === 'payment.expired')) {
      try {
        await markPaymentOrderTerminal(event.orderId, event.type === 'payment.failed' ? 'failed' : 'expired', event.paymentId ?? undefined);
      } catch (error) {
        req.log.error({ err: error, orderId: event.orderId }, 'Failed to mark SumoPod order terminal');
        res.status(500).json({ error: 'Internal server error' });
        return;
      }
    }
    res.status(200).json({ success: true, message: `${event.type} acknowledged` });
    return;
  }

  try {
    const existing = await getPaymentOrder(event.orderId);
    if (!existing) {
      res.status(400).json({ error: 'Unknown payment order' });
      return;
    }

    const result = await markPaymentOrderCompleted({
      orderId: event.orderId,
      sumopodPaymentId: event.paymentId,
      amount: event.amount,
      completedAt: event.completedAt,
    });

    if (result.state === 'rejected') {
      req.log.warn({ orderId: event.orderId, reason: result.reason }, 'Rejected SumoPod payment');
      res.status(400).json({ error: result.reason });
      return;
    }
    const activation = await activateSubscription(
      result.order.userEmail,
      result.order.plan,
      event.orderId,
    );
    if (!activation.success) {
      req.log.error({ orderId: event.orderId, error: activation.error }, 'Failed to activate SumoPod subscription');
      res.status(500).json({ success: false, error: 'Subscription activation failed' });
      return;
    }

    req.log.info({ orderId: event.orderId, plan: result.order.plan }, 'SumoPod subscription activated');
    res.status(200).json({ success: true, message: 'Subscription activated' });
  } catch (error) {
    req.log.error({ err: error }, 'SumoPod webhook processing failed');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;