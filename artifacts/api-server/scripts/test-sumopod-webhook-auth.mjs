import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authorizeSumopodWebhook,
  createSumopodWebhookSignature,
} from '../.test-build/sumopod-webhook-auth.js';

const body = Buffer.from('{"event_type":"payment.test","data":{}}');
const secret = 'hmac-secret';
const token = 'webhook-token';

test('accepts a valid X-Webhook-Token', () => {
  assert.equal(
    authorizeSumopodWebhook(body, {
      headers: { 'x-webhook-token': token },
      secret,
      token,
    }),
    true,
  );
});

test('accepts a valid HMAC signature', () => {
  const signature = createSumopodWebhookSignature(body, secret);
  assert.equal(
    authorizeSumopodWebhook(body, {
      headers: { 'x-signature': signature },
      secret,
      token,
    }),
    true,
  );
});

test('uses the token as a fallback when the HMAC signature is invalid', () => {
  assert.equal(
    authorizeSumopodWebhook(body, {
      headers: { 'x-signature': 'wrong-signature', 'x-webhook-token': token },
      secret,
      token,
    }),
    true,
  );
});

test('rejects invalid token and invalid signature', () => {
  assert.equal(
    authorizeSumopodWebhook(body, {
      headers: { 'x-signature': 'wrong-signature', 'x-webhook-token': 'wrong-token' },
      secret,
      token,
    }),
    false,
  );
});

test('rejects unauthenticated requests when credentials are configured', () => {
  assert.equal(
    authorizeSumopodWebhook(body, {
      headers: {},
      secret,
      token,
    }),
    false,
  );
});

test('supports the provider header names after Express lowercases them', () => {
  const signature = createSumopodWebhookSignature(body, secret);
  assert.equal(
    authorizeSumopodWebhook(body, {
      headers: {
        'x-signature': signature,
        'x-webhook-token': token,
      },
      secret,
      token,
    }),
    true,
  );
});