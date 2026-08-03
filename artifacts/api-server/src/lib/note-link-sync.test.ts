import test from 'node:test';
import assert from 'node:assert/strict';
import { extractHttpUrls } from './note-link-sync.js';

test('extracts unique http and https URLs from note fields', () => {
  assert.deepEqual(
    extractHttpUrls(
      'Baca https://example.com/article. Lihat juga https://example.com/article#section',
      'Dokumentasi: http://docs.example.com/path?q=1',
    ),
    ['https://example.com/article', 'http://docs.example.com/path?q=1'],
  );
});

test('ignores non-http protocols and malformed URL-like text', () => {
  assert.deepEqual(
    extractHttpUrls('mailto:test@example.com ftp://example.com https://[invalid'),
    [],
  );
});