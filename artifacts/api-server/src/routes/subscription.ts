import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin.js';
import { getCreditBalance } from '../lib/credit-service.js';
import { requireUser } from '../middleware/requireAuth.js';
import { listPaymentOrdersForUser } from '../lib/payment-orders.js';

const router = Router();
const SUBSCRIPTION_FEATURES = [
  'Catatan tanpa batas',
  'Akses Ringkas AI',
  'Google Sheets pribadi',
  'Sinkronisasi data',
];

// GET /api/subscription/status
// Returns the authenticated caller's own subscription status.
// Requires a valid Supabase access token in Authorization: Bearer <token>.
// The caller can only retrieve their own subscription — never another user's.
router.get('/subscription/status', async (req, res) => {
  try {
    // Extract bearer token from Authorization header
    const authHeader = String(req.headers['authorization'] ?? '');
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      res.status(401).json({ error: 'Authorization header with Bearer token is required' });
      return;
    }

    // Verify token and get the authenticated user's identity
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      req.log.warn({ authError: authError?.message }, 'Invalid or expired token for subscription status');
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Always look up the authenticated user's own profile — never a query-provided userId
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('subscription_status, subscription_plan, subscription_end')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      req.log.warn({ userId: user.id, error: error?.message }, 'Profile not found for subscription check');
      res.status(404).json({ error: 'User profile not found' });
      return;
    }

    let daysRemaining: number | null = null;
    if (profile.subscription_end) {
      const end = new Date(profile.subscription_end);
      const now = new Date();
      const diff = end.getTime() - now.getTime();
      daysRemaining = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    let creditBalance = 0;
    try {
      creditBalance = await getCreditBalance(user.id);
    } catch (creditError) {
      // Keep subscription status available while an operator is applying the
      // credit migration. The dedicated /credits endpoint remains explicit.
      req.log.warn({ creditError, userId: user.id }, 'Credit balance unavailable');
    }
    res.status(200).json({
      subscription_status: profile.subscription_status,
      subscription_plan: profile.subscription_plan ?? null,
      subscription_end: profile.subscription_end ?? null,
      days_remaining: daysRemaining,
      credit_balance: creditBalance,
    });
  } catch (err) {
    req.log.error({ err }, 'Unexpected error in /subscription/status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/subscription/overview', requireUser, async (req, res) => {
  try {
    const userId = req.userId!;
    const [{ data: profile, error: profileError }, orders, creditBalanceResult, { data: ledger, error: ledgerError }] =
      await Promise.all([
        supabaseAdmin
          .from('profiles')
          .select('subscription_status, subscription_plan, subscription_end, created_at')
          .eq('id', userId)
          .single(),
        listPaymentOrdersForUser(userId),
        getCreditBalance(userId),
        supabaseAdmin
          .from('credit_ledger')
          .select('amount')
          .eq('user_id', userId),
      ]);

    if (profileError || !profile) {
      res.status(404).json({ error: 'User profile not found' });
      return;
    }
    if (ledgerError) throw ledgerError;

    const end = profile.subscription_end ? new Date(profile.subscription_end) : null;
    const daysRemaining = end
      ? Math.max(0, Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;
    const completedOrders = orders.filter((order) => order.status === 'completed');
    const activeCycleOrder = completedOrders.find((order) => order.plan === profile.subscription_plan);
    const creditRows = (ledger ?? []) as Array<{ amount: number | string }>;
    const purchased = creditRows.reduce((total, row) => {
      const amount = Number(row.amount);
      return total + (amount > 0 ? amount : 0);
    }, 0);
    const used = creditRows.reduce((total, row) => {
      const amount = Number(row.amount);
      return total + (amount < 0 ? Math.abs(amount) : 0);
    }, 0);
    const latestProviderOrder = completedOrders.find((order) => order.sumopodPaymentId);

    res.status(200).json({
      data: {
        profile: {
          status: profile.subscription_status,
          plan: profile.subscription_plan ?? null,
          started_at: activeCycleOrder?.createdAt ?? null,
          ends_at: profile.subscription_end ?? null,
          days_remaining: daysRemaining,
          payment_method: latestProviderOrder ? 'SumoPod' : null,
        },
        features: SUBSCRIPTION_FEATURES,
        history: orders.map((order) => ({
          order_id: order.orderId,
          plan: order.plan,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          created_at: order.createdAt,
          completed_at: order.completedAt,
          payment_id: order.sumopodPaymentId,
          receipt_url: null,
          payment_link_url: order.paymentLinkUrl,
        })),
        credits: {
          balance: creditBalanceResult,
          purchased,
          used,
        },
      },
    });
  } catch (error) {
    req.log.error({ err: error, userId: req.userId }, 'Failed to load subscription overview');
    res.status(503).json({ error: 'Subscription information is temporarily unavailable' });
  }
});

router.get('/subscription/history', requireUser, async (req, res) => {
  try {
    const orders = await listPaymentOrdersForUser(req.userId!);
    res.status(200).json({
      data: {
        history: orders.map((order) => ({
          order_id: order.orderId,
          plan: order.plan,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
          created_at: order.createdAt,
          completed_at: order.completedAt,
          payment_id: order.sumopodPaymentId,
          receipt_url: null,
          payment_link_url: order.paymentLinkUrl,
        })),
      },
    });
  } catch (error) {
    req.log.error({ err: error, userId: req.userId }, 'Failed to load subscription history');
    res.status(503).json({ error: 'Subscription history is temporarily unavailable' });
  }
});

export default router;
