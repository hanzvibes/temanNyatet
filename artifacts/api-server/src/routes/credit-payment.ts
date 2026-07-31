import crypto from 'crypto';
import { Router } from 'express';
import { requireUser } from '../middleware/requireAuth.js';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { getCreditPackage } from '../lib/credit-packages.js';
import {
  attachCreditSumopodPayment,
  createPendingCreditPaymentOrder,
  markCreditPaymentOrderTerminal,
} from '../lib/credit-payment-orders.js';
import {
  createSumopodPayment,
  SumopodConfigurationError,
  SumopodProviderError,
} from '../lib/sumopod-payment.js';

const router = Router();

function frontendUrl(req: Parameters<typeof requireUser>[0]): string {
  return (process.env['FRONTEND_URL'] || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

router.post('/credits/topup/create', requireUser, async (req, res) => {
  const creditPackage = getCreditPackage(req.body?.package_id);
  if (!creditPackage) {
    res.status(400).json({ error: 'Paket credit tidak valid.' });
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

    const orderId = `TN-CREDIT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomUUID()}`;
    createdOrderId = orderId;
    await createPendingCreditPaymentOrder({
      orderId,
      userId: req.userId!,
      userEmail: profile.email,
      packageId: creditPackage.id,
      credits: creditPackage.credits,
      amount: creditPackage.amount,
    });

    const payment = await createSumopodPayment({
      orderId,
      amount: creditPackage.amount,
      successReturnUrl: `${frontendUrl(req)}/catatan?credit_status=success`,
      cancelReturnUrl: `${frontendUrl(req)}/catatan?credit_status=cancelled`,
    });

    if (payment.orderId !== orderId || payment.amount !== creditPackage.amount) {
      await markCreditPaymentOrderTerminal(orderId, 'failed');
      res.status(502).json({ error: 'Respons payment tidak cocok dengan pesanan.' });
      return;
    }

    const order = await attachCreditSumopodPayment(orderId, {
      paymentId: payment.paymentId,
      paymentLinkUrl: payment.paymentLinkUrl,
      expiresAt: payment.expiresAt,
    });

    res.status(200).json({
      data: {
        order_id: order.orderId,
        payment_link_url: order.paymentLinkUrl,
        expires_at: order.expiresAt,
        package_id: order.packageId,
        credits: order.credits,
        amount: order.amount,
      },
    });
  } catch (error) {
    if (createdOrderId && (error instanceof SumopodProviderError || error instanceof SumopodConfigurationError)) {
      await markCreditPaymentOrderTerminal(createdOrderId, 'failed').catch((terminalError) => {
        req.log.error({ err: terminalError, orderId: createdOrderId }, 'Failed to close credit payment order');
      });
    }
    if (error instanceof SumopodConfigurationError) {
      res.status(503).json({ error: 'Payment Sandbox belum dikonfigurasi di server.' });
      return;
    }
    if (error instanceof SumopodProviderError) {
      req.log.error({ err: error }, 'SumoPod credit payment creation failed');
      res.status(502).json({ error: 'Payment sedang tidak tersedia. Coba lagi.' });
      return;
    }
    req.log.error({ err: error, userId: req.userId }, 'Credit payment order creation failed');
    res.status(500).json({ error: 'Gagal menyiapkan pembayaran credit.' });
  }
});

export default router;