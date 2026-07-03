import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env['SUPABASE_URL'] ?? '';
const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

if (!supabaseUrl || !serviceRoleKey) {
  // Warn rather than throw — lets the dev server start for health-check testing.
  // Webhook and cron endpoints will return 500 until credentials are configured.
  console.warn(
    '[supabase-admin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set. ' +
    'Subscription and webhook endpoints will fail. Set them in your environment.',
  );
}

// Admin client with service role key — bypasses RLS.
// NEVER expose this client or its key to the frontend.
export const supabaseAdmin = createClient(supabaseUrl || 'http://localhost', serviceRoleKey || 'placeholder', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Activate a user subscription after payment
export async function activateSubscription(
  email: string,
  plan: 'monthly' | 'yearly',
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseUrl || !serviceRoleKey) {
    return { success: false, error: 'Supabase credentials not configured' };
  }

  const now = new Date();
  const subscriptionEnd =
    plan === 'yearly'
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      subscription_status: 'active',
      subscription_plan: plan,
      subscription_end: subscriptionEnd.toISOString(),
    })
    .eq('email', email);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Archive all accounts with expired subscription_end
export async function archiveExpiredAccounts(): Promise<{
  count: number;
  error?: string;
}> {
  if (!supabaseUrl || !serviceRoleKey) {
    return { count: 0, error: 'Supabase credentials not configured' };
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ subscription_status: 'archived' })
    .eq('subscription_status', 'active')
    .lt('subscription_end', new Date().toISOString())
    .select('id');

  if (error) {
    return { count: 0, error: error.message };
  }

  return { count: data?.length ?? 0 };
}
