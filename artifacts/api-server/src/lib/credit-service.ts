import { supabaseAdmin } from './supabase-admin.js';

export const INITIAL_AI_CREDITS = Math.max(
  0,
  Number.parseInt(process.env['INITIAL_AI_CREDITS'] ?? '10', 10) || 10,
);

// Kept as a named configuration value so deployments can inspect and change
// the default without hunting through feature routes. Supabase signup
// triggers use the matching app.initial_ai_credits database setting.
export const DEFAULT_CREDIT_CONFIG = { initialAiCredits: INITIAL_AI_CREDITS } as const;

export class CreditsExhaustedError extends Error {
  constructor() {
    super('CREDITS_EXHAUSTED');
    this.name = 'CreditsExhaustedError';
  }
}

type CreditRpcResult = { balance: number } | null;

export async function getCreditBalance(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('get_credit_balance', { target_user_id: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return Number((row as CreditRpcResult)?.balance ?? 0);
}

export async function consumeCredit(
  userId: string,
  reason = 'ai_summary',
  referenceId?: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('consume_credit', {
    target_user_id: userId,
    credit_reason: reason,
    credit_reference: referenceId ?? null,
  });
  if (error) {
    if (error.message.includes('CREDITS_EXHAUSTED')) throw new CreditsExhaustedError();
    throw error;
  }
  const row = Array.isArray(data) ? data[0] : data;
  return Number((row as CreditRpcResult)?.balance ?? 0);
}

export async function grantCredit(
  userId: string,
  amount: number,
  reason: string,
  referenceId: string,
): Promise<number> {
  const { data, error } = await supabaseAdmin.rpc('grant_credit', {
    target_user_id: userId,
    credit_amount: amount,
    credit_reason: reason,
    credit_reference: referenceId,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return Number((row as CreditRpcResult)?.balance ?? 0);
}

export async function grantCreditToEmail(
  email: string,
  amount: number,
  reason: string,
  referenceId: string,
): Promise<number> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  if (!profile) throw new Error('USER_NOT_FOUND');
  return grantCredit(profile.id, amount, reason, referenceId);
}