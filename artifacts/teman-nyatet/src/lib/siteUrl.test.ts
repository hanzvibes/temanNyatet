import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getEmailRedirectUrl, getSiteUrl } from '@/lib/siteUrl';

// In the Vite browser build getSiteUrl reads import.meta.env, which does not
// exist in plain Node — the module falls back to process.env there. Values are
// read at call time, so mutating between tests works.
const procEnv = process.env as Record<string, string | undefined>;
const originalViteSiteUrl = procEnv.VITE_SITE_URL;
const originalWindow = (globalThis as Record<string, unknown>).window;

function setEnv(viteSiteUrl: string | undefined) {
  if (viteSiteUrl === undefined) delete procEnv.VITE_SITE_URL;
  else procEnv.VITE_SITE_URL = viteSiteUrl;
}

test('getSiteUrl uses VITE_SITE_URL and trims trailing slash', () => {
  setEnv('https://notes.example.com/');
  assert.equal(getSiteUrl(), 'https://notes.example.com');

  setEnv('  https://notes.example.com  ');
  assert.equal(getSiteUrl(), 'https://notes.example.com');
});

test('getSiteUrl falls back to window.location.origin when env is empty', () => {
  setEnv('');
  (globalThis as Record<string, unknown>).window = {
    location: { origin: 'https://preview.example.test' },
  };
  assert.equal(getSiteUrl(), 'https://preview.example.test');
});

test('getSiteUrl returns empty string with no env and no window', () => {
  setEnv(undefined);
  (globalThis as Record<string, unknown>).window = undefined;
  assert.equal(getSiteUrl(), '');
});

test('getEmailRedirectUrl defaults to /login', () => {
  setEnv('https://notes.example.com');
  assert.equal(getEmailRedirectUrl(), 'https://notes.example.com/login');
});

test('getEmailRedirectUrl joins the configured site URL with the path', () => {
  setEnv('https://notes.example.com/');
  assert.equal(
    getEmailRedirectUrl('/login?confirmed=true'),
    'https://notes.example.com/login?confirmed=true',
  );
});

test('getEmailRedirectUrl normalizes a path without a leading slash', () => {
  setEnv('https://notes.example.com');
  assert.equal(getEmailRedirectUrl('auth/confirm'), 'https://notes.example.com/auth/confirm');
});

test('getEmailRedirectUrl keeps the query string intact', () => {
  setEnv('https://notes.example.com');
  assert.equal(
    getEmailRedirectUrl('/login?confirmed=true'),
    'https://notes.example.com/login?confirmed=true',
  );
});

// Restore the environment for other suites in the same process.
test('teardown restores original env and window', () => {
  if (originalViteSiteUrl === undefined) delete procEnv.VITE_SITE_URL;
  else procEnv.VITE_SITE_URL = originalViteSiteUrl;
  (globalThis as Record<string, unknown>).window = originalWindow;
  assert.ok(true);
});
