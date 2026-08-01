import { Router, type IRouter } from 'express';
import crypto from 'crypto';
import { activateSubscription } from '../lib/supabase-admin.js';
import { grantCreditToEmail } from '../lib/credit-service.js';
import { MayarPaymentProvider } from '../lib/payment-provider.js';

const router: IRouter = Router();
const paymentProvider = new MayarPaymentProvider();

// Verify Mayar webhook HMAC-SHA256 signature against the EXACT raw body bytes
function verifyMayarSignature(rawBody: Buffer, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    // Ensure same-length hex strings before constant-time compare
    if (signature.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Determine subscription plan from Mayar payload
function resolvePlan(payload: Record<string, unknown>): 'monthly' | 'yearly' {
  const planName = String(payload['plan_name'] ?? '').toLowerCase();
  const planId = String(payload['plan_id'] ?? '').toLowerCase();
  const amount = Number(payload['amount'] ?? 0);

  if (planName.includes('tahun') || planName.includes('year') || planId.includes('yearly')) {
    return 'yearly';
  }
  if (planName.includes('bulan') || planName.includes('month') || planId.includes('monthly')) {
    return 'monthly';
  }
  // Fall back to amount heuristic: Rp249.000/year vs Rp100.000/month
  return amount >= 200000 ? 'yearly' : 'monthly';
}

// POST /api/mayar-webhook
// express.raw() is applied per-route in app.ts so we receive the raw body Buffer.
// Signature verification is mandatory — all unsigned requests are rejected.
router.post(
  '/mayar-webhook',
  // express.raw() is already mounted for this path in app.ts before express.json()
  // — do NOT re-apply it here or it will try to parse an already-decoded Buffer.
  async (req, res) => {
    const secret = process.env['MAYAR_WEBHOOK_SECRET'];
    if (!secret) {
      req.log.error('MAYAR_WEBHOOK_SECRET is not set — webhook endpoint is disabled');
      res.status(503).json({ error: 'Webhook not configured' });
      return;
    }

    // Signature header is always required
    const signature =
      (req.headers['x-mayar-signature'] as string | undefined) ??
      (req.headers['x-signature'] as string | undefined) ??
      '';

    if (!signature) {
      req.log.warn('Mayar webhook request missing signature header — rejected');
      res.status(401).json({ error: 'Missing signature' });
      return;
    }

    // req.body is a Buffer when express.raw() is active
    const rawBody: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

    if (!verifyMayarSignature(rawBody, signature, secret)) {
      req.log.warn({ signature }, 'Invalid Mayar webhook signature — rejected');
      res.status(400).json({ error: 'Invalid signature' });
      return;
    }

    // Parse JSON from verified raw body
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    } catch {
      req.log.warn('Mayar webhook has invalid JSON body');
      res.status(400).json({ error: 'Invalid JSON body' });
      return;
    }

    const event = String(body['event'] ?? '');
    const data = (body['data'] as Record<string, unknown>) ?? {};

    req.log.info({ event }, 'Mayar webhook received');

    const isPaymentSuccess =
      event === 'payment.success' || event === 'order.completed' || event === 'invoice.paid';

    if (!isPaymentSuccess) {
      // Acknowledge non-payment events without processing
      res.status(200).json({ success: true, message: `Event ${event} acknowledged` });
      return;
    }

    const creditPurchase = paymentProvider.parseSuccessfulCreditPurchase(body);
    if (creditPurchase) {
      try {
        const balance = await grantCreditToEmail(
          creditPurchase.userEmail,
          creditPurchase.credits,
          'mayar_topup',
          creditPurchase.referenceId,
        );
        res.status(200).json({ success: true, balance, message: 'Credits added' });
      } catch (err) {
        req.log.error({ err, referenceId: creditPurchase.referenceId }, 'Failed to grant purchased credits');
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
      return;
    }

    const email = String(data['customer_email'] ?? '');
    if (!email) {
      req.log.warn({ data }, 'Missing customer_email in Mayar webhook payload');
      res.status(400).json({ error: 'Missing customer_email in payload' });
      return;
    }

    const plan = resolvePlan(data);
    req.log.info({ email, plan }, 'Activating subscription');

    let result: { success: boolean; error?: string };
    try {
      result = await activateSubscription(email, plan);
    } catch (err) {
      req.log.error({ email, err }, 'Unexpected error calling activateSubscription');
      // Return 500 so Mayar retries — this is a transient failure (network/DB), not a business-logic failure
      res.status(500).json({ success: false, message: 'Internal server error' });
      return;
    }

    if (!result.success) {
      req.log.error({ email, error: result.error }, 'Failed to activate subscription');
      // Return 200 so Mayar doesn't retry endlessly — we log and monitor separately
      res.status(200).json({ success: false, message: result.error });
      return;
    }

    req.log.info({ email, plan }, 'Subscription activated successfully');
    res.status(200).json({ success: true, message: 'Subscription activated' });
  },
);

export default router;
