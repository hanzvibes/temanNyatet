import crypto from 'crypto';

type WebhookHeaders = Record<string, string | string[] | undefined>;

function firstHeader(headers: WebhookHeaders, ...names: string[]): string {
  for (const name of names) {
    const value = headers[name];
    if (Array.isArray(value)) return String(value[0] ?? '').trim();
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function timingSafeEqualText(provided: string, expected: string): boolean {
  if (!provided || !expected) return false;
  const providedDigest = crypto.createHash('sha256').update(provided).digest();
  const expectedDigest = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(providedDigest, expectedDigest);
}

export function createSumopodWebhookSignature(rawBody: Buffer, secret: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifySumopodWebhookSignature(
  rawBody: Buffer,
  signature: string,
  secret: string,
): boolean {
  const normalizedSignature = signature.trim().replace(/^sha256=/i, '');
  const expected = createSumopodWebhookSignature(rawBody, secret);
  return timingSafeEqualText(normalizedSignature, expected);
}

export function authorizeSumopodWebhook(
  rawBody: Buffer,
  options: {
    headers: WebhookHeaders;
    secret?: string;
    token?: string;
  },
): boolean {
  const secret = options.secret?.trim() ?? '';
  const token = options.token?.trim() ?? '';
  const signature = firstHeader(options.headers, 'x-sumopod-signature', 'x-signature');
  const webhookToken = firstHeader(options.headers, 'x-webhook-token');

  // Keep local development compatible when no webhook credential is configured.
  if (!secret && !token) return true;

  const validSignature = secret
    ? verifySumopodWebhookSignature(rawBody, signature, secret)
    : false;
  const validToken = token ? timingSafeEqualText(webhookToken, token) : false;
  return validSignature || validToken;
}