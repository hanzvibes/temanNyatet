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
  const originalDay = now.getDate();

  // Add 1 month or 1 year. JS Date arithmetic overflows on month-end dates
  // (e.g. Jan 31 + 1 month = Mar 3). We clamp to the last valid day of the
  // target month by detecting the overflow and stepping back to day 0 (which
  // resolves to the last day of the preceding month).
  const subscriptionEnd = new Date(now);
  if (plan === 'yearly') {
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
  } else {
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1);
  }
  if (subscriptionEnd.getDate() !== originalDay) {
    // Overflowed — clamp to last day of the intended month
    subscriptionEnd.setDate(0);
  }

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
