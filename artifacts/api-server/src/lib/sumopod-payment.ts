import crypto from 'crypto';

const DEFAULT_BASE_URL = 'https://api-pay-sandbox.sumopod.com';
const ACCEPTED_CREATED_PAYMENT_STATUSES = new Set([
  'pending',
  'created',
  'awaiting_payment',
]);

export type CreateSumopodPaymentInput = {
  orderId: string;
  amount: number;
  successReturnUrl: string;
  cancelReturnUrl: string;
  expiresInHours?: number;
};

export type SumopodPaymentResponse = {
  paymentId: string;
  orderId: string;
  amount: number;
  status: string;
  paymentLinkUrl: string;
  expiresAt: string | null;
};

export type SumopodWebhookEvent =
  | {
      type: 'payment.completed';
      paymentId: string;
      orderId: string;
      amount: number;
      completedAt: string | null;
    }
  | {
      type: 'payment.failed' | 'payment.expired' | 'payment.test';
      paymentId: string | null;
      orderId: string | null;
      amount: number | null;
    };

export class SumopodConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SumopodConfigurationError';
  }
}

export class SumopodProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SumopodProviderError';
  }
}

function getConfig(): { apiKey: string; baseUrl: string } {
  const apiKey = process.env['SUMOPOD_PAYMENT_API_KEY']?.trim();
  if (!apiKey) {
    throw new SumopodConfigurationError('SUMOPOD_PAYMENT_API_KEY is not configured');
  }
  return {
    apiKey,
    baseUrl: (process.env['SUMOPOD_PAYMENT_BASE_URL'] || DEFAULT_BASE_URL).replace(/\/$/, ''),
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? value as Record<string, unknown> : null;
}

function requiredString(value: unknown, field: string): string {
  const result = String(value ?? '').trim();
  if (!result) throw new SumopodProviderError(`SumoPod response missing ${field}`);
  return result;
}

export async function createSumopodPayment(
  input: CreateSumopodPaymentInput,
): Promise<SumopodPaymentResponse> {
  const { apiKey, baseUrl } = getConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(`${baseUrl}/api/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify({
        order_id: input.orderId,
        amount: input.amount,
        currency: 'IDR',
        expires_in_hours: input.expiresInHours ?? 24,
        success_return_url: input.successReturnUrl,
        cancel_return_url: input.cancelReturnUrl,
      }),
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new SumopodProviderError(`SumoPod returned HTTP ${response.status}`);

    const data = asRecord(body);
    const paymentId = requiredString(data?.payment_id, 'payment_id');
    const orderId = requiredString(data?.order_id, 'order_id');
    const paymentLinkUrl = requiredString(data?.payment_link_url, 'payment_link_url');
    try {
      new URL(paymentLinkUrl);
    } catch {
      throw new SumopodProviderError('SumoPod response contains an invalid payment link');
    }
    const amount = Number(data?.amount);
    if (!Number.isSafeInteger(amount)) throw new SumopodProviderError('SumoPod response contains an invalid amount');

    const status = requiredString(data?.status, 'status').toLowerCase();
    if (!ACCEPTED_CREATED_PAYMENT_STATUSES.has(status)) {
      throw new SumopodProviderError(`Unsupported SumoPod payment status: ${status}`);
    }

    return {
      paymentId,
      orderId,
      amount,
      status,
      paymentLinkUrl,
      expiresAt: data?.expires_at ? String(data.expires_at) : null,
    };
  } catch (error) {
    if (error instanceof SumopodProviderError || error instanceof SumopodConfigurationError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SumopodProviderError('SumoPod request timed out');
    }
    throw new SumopodProviderError('SumoPod payment request failed');
  } finally {
    clearTimeout(timeout);
  }
}

export function parseSumopodWebhook(payload: unknown): SumopodWebhookEvent | null {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const type = String(root?.event_type ?? '');
  if (!['payment.completed', 'payment.failed', 'payment.expired', 'payment.test'].includes(type)) {
    return null;
  }

  const paymentId = data?.payment_id ? String(data.payment_id) : null;
  const orderId = data?.order_id ? String(data.order_id) : null;
  const amount = data?.amount == null ? null : Number(data.amount);
  if (amount !== null && !Number.isSafeInteger(amount)) return null;

  if (type === 'payment.completed') {
    if (!paymentId || !orderId || amount === null) return null;
    return {
      type,
      paymentId,
      orderId,
      amount,
      completedAt: data?.completed_at ? String(data.completed_at) : null,
    };
  }
  return { type: type as 'payment.failed' | 'payment.expired' | 'payment.test', paymentId, orderId, amount };
}

export function verifySumopodWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}