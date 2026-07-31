import { Router } from 'express';
import {
  getPaymentOrder,
  markPaymentOrderCompleted,
  markPaymentOrderTerminal,
} from '../lib/payment-orders.js';
import {
  getCreditPaymentOrder,
  markCreditPaymentOrderCompleted,
  markCreditPaymentOrderGranted,
  markCreditPaymentOrderTerminal,
} from '../lib/credit-payment-orders.js';
import { grantCredit } from '../lib/credit-service.js';
import {
  parseSumopodWebhook,
} from '../lib/sumopod-payment.js';
import { authorizeSumopodWebhook } from '../lib/sumopod-webhook-auth.js';
import { activateSubscription } from '../lib/supabase-admin.js';

const router = Router();
const CREDIT_ORDER_PREFIX = 'TN-CREDIT-';

function isCreditOrder(orderId: string): boolean {
  return orderId.startsWith(CREDIT_ORDER_PREFIX);
}

router.post('/sumopod-webhook', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.from(JSON.stringify(req.body ?? {}));
  const configuredSecret = process.env['SUMOPOD_WEBHOOK_SECRET']?.trim();
  const configuredToken = process.env['SUMOPOD_WEBHOOK_TOKEN']?.trim();

  if (!authorizeSumopodWebhook(rawBody, {
    headers: req.headers,
    secret: configuredSecret,
    token: configuredToken,
  })) {
    req.log.warn('Invalid SumoPod webhook credentials');
    res.status(401).json({ error: 'Invalid webhook credentials' });
    return;
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
        if (isCreditOrder(event.orderId)) {
          await markCreditPaymentOrderTerminal(
            event.orderId,
            event.type === 'payment.failed' ? 'failed' : 'expired',
            event.paymentId ?? undefined,
          );
        } else {
          await markPaymentOrderTerminal(
            event.orderId,
            event.type === 'payment.failed' ? 'failed' : 'expired',
            event.paymentId ?? undefined,
          );
        }
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
    if (isCreditOrder(event.orderId)) {
      const existingCreditOrder = await getCreditPaymentOrder(event.orderId);
      if (!existingCreditOrder) {
        res.status(400).json({ error: 'Unknown credit payment order' });
        return;
      }

      const creditResult = await markCreditPaymentOrderCompleted({
        orderId: event.orderId,
        sumopodPaymentId: event.paymentId,
        amount: event.amount,
        completedAt: event.completedAt,
      });

      if (creditResult.state === 'rejected') {
        req.log.warn(
          { orderId: event.orderId, reason: creditResult.reason },
          'Rejected SumoPod credit payment',
        );
        res.status(400).json({ error: creditResult.reason });
        return;
      }

      // grant_credit is idempotent on (user, reason, reference). Calling it
      // for both the initial delivery and completed-order retries closes the
      // failure window between the grant and the granted_at marker update.
      await grantCredit(
        creditResult.order.userId,
        creditResult.order.credits,
        'sumopod_topup',
        event.orderId,
      );
      await markCreditPaymentOrderGranted(event.orderId);

      req.log.info(
        { orderId: event.orderId, credits: creditResult.order.credits },
        'SumoPod AI credits granted',
      );
      res.status(200).json({
        success: true,
        message: 'AI credits added',
        credits: creditResult.order.credits,
      });
      return;
    }

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