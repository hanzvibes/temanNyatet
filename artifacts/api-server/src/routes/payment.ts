import crypto from 'crypto';
import { Router, type IRouter } from 'express';
import { requireUser } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import {
  attachSumopodPayment,
  createPendingPaymentOrder,
  isPaymentPlan,
  markPaymentOrderTerminal,
  PAYMENT_AMOUNTS,
} from '../lib/payment-orders.js';
import {
  createSumopodPayment,
  SumopodConfigurationError,
  SumopodProviderError,
} from '../lib/sumopod-payment.js';

const router: IRouter = Router();

function frontendUrl(req: Parameters<typeof requireUser>[0]): string {
  return (process.env['FRONTEND_URL'] || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

router.post('/payment/create', requireUser, async (req, res) => {
  const plan = req.body?.plan;
  if (!isPaymentPlan(plan)) {
    res.status(400).json({ error: 'Pilih paket bulanan atau tahunan.' });
    return;
  }

  let createdOrderId: string | null = null;
  try {
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', req.userId!)
      .single();

    if (profileError || !profile?.email) {
      res.status(404).json({ error: 'Profil pengguna tidak ditemukan.' });
      return;
    }

    const orderId = `TN-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID()}`;
    createdOrderId = orderId;
    const amount = PAYMENT_AMOUNTS[plan];
    await createPendingPaymentOrder({
      orderId,
      userId: req.userId!,
      userEmail: profile.email,
      plan,
      amount,
    });

    const payment = await createSumopodPayment({
      orderId,
      amount,
      successReturnUrl: `${frontendUrl(req)}/payment?status=success`,
      cancelReturnUrl: `${frontendUrl(req)}/payment?status=cancelled`,
    });

    if (payment.orderId !== orderId || payment.amount !== amount) {
      await markPaymentOrderTerminal(orderId, 'failed');
      res.status(502).json({ error: 'Respons payment tidak cocok dengan pesanan.' });
      return;
    }

    const order = await attachSumopodPayment(orderId, {
      paymentId: payment.paymentId,
      paymentLinkUrl: payment.paymentLinkUrl,
      expiresAt: payment.expiresAt,
    });

    res.status(200).json({
      data: {
        order_id: order.orderId,
        payment_link_url: order.paymentLinkUrl,
        expires_at: order.expiresAt,
        plan: order.plan,
        amount: order.amount,
      },
    });
  } catch (error) {
    // A provider/configuration failure must not leave a server-created order
    // looking payable forever. This update is best-effort; the original
    // sanitized error remains the response.
    if (createdOrderId && (error instanceof SumopodProviderError || error instanceof SumopodConfigurationError)) {
      await markPaymentOrderTerminal(createdOrderId, 'failed').catch((terminalError) => {
        req.log.error({ err: terminalError, orderId: createdOrderId }, 'Failed to close payment order');
      });
    }
    if (error instanceof SumopodConfigurationError) {
      res.status(503).json({ error: 'Payment Sandbox belum dikonfigurasi di server.' });
      return;
    }
    if (error instanceof SumopodProviderError) {
      req.log.error({ err: error }, 'SumoPod payment creation failed');
      res.status(502).json({ error: 'Payment sedang tidak tersedia. Coba lagi.' });
      return;
    }
    req.log.error({ err: error, userId: req.userId }, 'Payment order creation failed');
    res.status(500).json({ error: 'Gagal menyiapkan pembayaran.' });
  }
});

export default router;