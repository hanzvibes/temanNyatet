import { supabaseAdmin } from './supabase-admin.js';

export type PaymentPlan = 'monthly' | 'yearly';
export type PaymentOrderStatus = 'pending' | 'completed' | 'failed' | 'expired';

export const PAYMENT_AMOUNTS: Record<PaymentPlan, number> = {
  monthly: 100_000,
  yearly: 249_000,
};

export type PaymentOrder = {
  orderId: string;
  userId: string;
  userEmail: string;
  plan: PaymentPlan;
  amount: number;
  currency: 'IDR';
  status: PaymentOrderStatus;
  sumopodPaymentId: string | null;
  paymentLinkUrl: string | null;
  expiresAt: string | null;
  completedAt: string | null;
};

export type CreatePaymentOrderInput = {
  orderId: string;
  userId: string;
  userEmail: string;
  plan: PaymentPlan;
  amount: number;
};

export type CompletePaymentOrderInput = {
  orderId: string;
  sumopodPaymentId: string;
  amount: number;
  completedAt?: string | null;
};

export type CompletePaymentOrderResult =
  | { state: 'claimed'; order: PaymentOrder }
  | { state: 'already_completed'; order: PaymentOrder }
  | { state: 'rejected'; order: PaymentOrder | null; reason: string };

export function isPaymentPlan(value: unknown): value is PaymentPlan {
  return value === 'monthly' || value === 'yearly';
}

function fromRow(row: Record<string, unknown>): PaymentOrder {
  return {
    orderId: String(row.order_id),
    userId: String(row.user_id),
    userEmail: String(row.user_email),
    plan: row.plan as PaymentPlan,
    amount: Number(row.amount),
    currency: 'IDR',
    status: row.status as PaymentOrderStatus,
    sumopodPaymentId: row.sumopod_payment_id ? String(row.sumopod_payment_id) : null,
    paymentLinkUrl: row.payment_link_url ? String(row.payment_link_url) : null,
    expiresAt: row.expires_at ? String(row.expires_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

export async function createPendingPaymentOrder(input: CreatePaymentOrderInput): Promise<PaymentOrder> {
  if (!isPaymentPlan(input.plan) || PAYMENT_AMOUNTS[input.plan] !== input.amount) {
    throw new Error('Invalid payment plan amount');
  }

  const { data, error } = await supabaseAdmin
    .from('payment_orders')
    .insert({
      order_id: input.orderId,
      user_id: input.userId,
      user_email: input.userEmail,
      plan: input.plan,
      amount: input.amount,
      currency: 'IDR',
      status: 'pending',
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create payment order');
  return fromRow(data as Record<string, unknown>);
}

export async function attachSumopodPayment(
  orderId: string,
  input: { paymentId: string; paymentLinkUrl: string; expiresAt?: string | null },
): Promise<PaymentOrder> {
  const { data, error } = await supabaseAdmin
    .from('payment_orders')
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

  if (error || !data) throw new Error(error?.message ?? 'Failed to update payment order');
  return fromRow(data as Record<string, unknown>);
}

export async function getPaymentOrder(orderId: string): Promise<PaymentOrder | null> {
  const { data, error } = await supabaseAdmin
    .from('payment_orders')
    .select('*')
    .eq('order_id', orderId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? fromRow(data as Record<string, unknown>) : null;
}

export async function markPaymentOrderCompleted(
  input: CompletePaymentOrderInput,
): Promise<CompletePaymentOrderResult> {
  const current = await getPaymentOrder(input.orderId);
  if (!current) return { state: 'rejected', order: null, reason: 'Unknown payment order' };
  if (current.amount !== input.amount) {
    return { state: 'rejected', order: current, reason: 'Payment amount mismatch' };
  }
  if (
    current.sumopodPaymentId &&
    current.sumopodPaymentId !== input.sumopodPaymentId
  ) {
    return { state: 'rejected', order: current, reason: 'Payment ID mismatch' };
  }
  if (current.status === 'completed') {
    return { state: 'already_completed', order: current };
  }
  if (current.status !== 'pending') {
    return { state: 'rejected', order: current, reason: `Order is ${current.status}` };
  }

  // The pending predicate makes the claim idempotent under concurrent webhook
  // deliveries. Only the request that changes pending → completed may activate.
  const { data, error } = await supabaseAdmin
    .from('payment_orders')
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

  const afterClaim = await getPaymentOrder(input.orderId);
  if (afterClaim?.status === 'completed') {
    return { state: 'already_completed', order: afterClaim };
  }
  return { state: 'rejected', order: afterClaim, reason: 'Payment order could not be claimed' };
}

export async function markPaymentOrderTerminal(
  orderId: string,
  status: 'failed' | 'expired',
  providerPaymentId?: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('payment_orders')
    .update({
      status,
      ...(providerPaymentId ? { sumopod_payment_id: providerPaymentId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('order_id', orderId)
    .eq('status', 'pending');

  if (error) throw new Error(error.message);
}