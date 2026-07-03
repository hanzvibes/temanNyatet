import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin';

const router = Router();

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

    res.status(200).json({
      subscription_status: profile.subscription_status,
      subscription_plan: profile.subscription_plan ?? null,
      subscription_end: profile.subscription_end ?? null,
      days_remaining: daysRemaining,
    });
  } catch (err) {
    req.log.error({ err }, 'Unexpected error in /subscription/status');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
