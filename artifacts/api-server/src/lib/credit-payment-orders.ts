import { supabaseAdmin } from './supabase-admin.js';
import type { CreditPackageId } from './credit-packages.js';

export type CreditPaymentOrderStatus = 'pending' | 'completed' | 'failed' | 'expired';

export type CreditPaymentOrder = {
  orderId: string;
  userId: string;
  userEmail: string;
  packageId: CreditPackageId;
  credits: number;
  amount: number;
  status: CreditPaymentOrderStatus;
  sumopodPaymentId: string | null;
  paymentLinkUrl: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  grantedAt: string | null;
};

export type CreateCreditPaymentOrderInput = {
  orderId: string;
  userId: string;
  userEmail: string;
  packageId: CreditPackageId;
  credits: number;
  amount: number;
};

export type CompleteCreditPaymentOrderInput = {
  orderId: string;
  sumopodPaymentId: string;
  amount: number;
  completedAt?: string | null;
};

export type CompleteCreditPaymentOrderResult =
  | { state: 'claimed' | 'already_completed'; order: CreditPaymentOrder }
  | { state: 'rejected'; order: CreditPaymentOrder | null; reason: string };

function fromRow(row: Record<string, unknown>): CreditPaymentOrder {
  return {
    orderId: String(row.order_id),
    userId: String(row.user_id),
    userEmail: String(row.user_email),
    packageId: row.package_id as CreditPackageId,
    credits: Number(row.credits),
    amount: Number(row.amount),
    status: row.status as CreditPaymentOrderStatus,
    sumopodPaymentId: row.sumopod_payment_id ? String(row.sumopod_payment_id) : null,
    paymentLinkUrl: row.payment_link_url ? String(row.payment_link_url) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    grantedAt: row.granted_at ? String(row.granted_at) : null,
  };
}

export async function createPendingCreditPaymentOrder(
  input: CreateCreditPaymentOrderInput,
): Promise<CreditPaymentOrder> {
  const { data, error } = await supabaseAdmin
    .from('credit_payment_orders')
    .insert({
      order_id: input.orderId,
      user_id: input.userId,
      user_email: input.userEmail,
      package_id: input.packageId,
      credits: input.credits,
      amount: input.amount,
      currency: 'IDR',
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create credit payment order');
  return fromRow(data as Record<string, unknown>);
}

export async function attachCreditSumopodPayment(
  orderId: string,
  input: { paymentId: string; paymentLinkUrl: string; expiresAt?: string | null },
): Promise<CreditPaymentOrder> {
  const { data, error } = await supabaseAdmin
    .from('credit_payment_orders')
    .update({
      sumopod_payment_id: input.paymentId,
      payment_link_url: input.paymentLinkUrl,
      expires_at: input.expiresAt ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .eq('status', 'pending')
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to attach credit payment');
  return fromRow(data as Record<string, unknown>);
}

export async function getCreditPaymentOrder(orderId: string): Promise<CreditPaymentOrder | null> {
  const { data, error } = await supabaseAdmin
    .from('credit_payment_orders')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? fromRow(data as Record<string, unknown>) : null;
}

export async function markCreditPaymentOrderCompleted(
  input: CompleteCreditPaymentOrderInput,
): Promise<CompleteCreditPaymentOrderResult> {
  const current = await getCreditPaymentOrder(input.orderId);
  if (!current) return { state: 'rejected', order: null, reason: 'Unknown credit payment order' };
  if (current.amount !== input.amount) {
    return { state: 'rejected', order: current, reason: 'Payment amount mismatch' };
  }
  if (current.sumopodPaymentId && current.sumopodPaymentId !== input.sumopodPaymentId) {
    return { state: 'rejected', order: current, reason: 'Payment ID mismatch' };
  }
  if (current.status === 'completed') return { state: 'already_completed', order: current };
  if (current.status !== 'pending') {
    return { state: 'rejected', order: current, reason: `Order is ${current.status}` };
  }

  const { data, error } = await supabaseAdmin
    .from('credit_payment_orders')
    .update({
      status: 'completed',
      sumopod_payment_id: input.sumopodPaymentId,
      completed_at: input.completedAt ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', input.orderId)
    .eq('status', 'pending')
    .select('*')
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return { state: 'claimed', order: fromRow(data as Record<string, unknown>) };

  const afterClaim = await getCreditPaymentOrder(input.orderId);
  if (afterClaim?.status === 'completed') {
    return { state: 'already_completed', order: afterClaim };
  }
  return {
    state: 'rejected',
    order: afterClaim,
    reason: 'Credit payment order could not be claimed',
  };
}

export async function markCreditPaymentOrderGranted(orderId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('credit_payment_orders')
    .update({
      granted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .eq('status', 'completed')
    .is('granted_at', null);

  if (error) throw new Error(error.message);
}

export async function markCreditPaymentOrderTerminal(
  orderId: string,
  status: 'failed' | 'expired',
  providerPaymentId?: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('credit_payment_orders')
    .update({
      status,
      ...(providerPaymentId ? { sumopod_payment_id: providerPaymentId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);
}