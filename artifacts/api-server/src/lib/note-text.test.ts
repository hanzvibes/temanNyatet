import assert from 'node:assert/strict';
import test from 'node:test';
import { isRichText, stripHtmlForSummary } from './note-text.js';

test('plain-text notes pass through unchanged', () => {
  assert.equal(stripHtmlForSummary('Catatan polos'), 'Catatan polos');
});

test('isRichText distinguishes plain text from HTML', () => {
  assert.equal(isRichText('Halo dunia'), false);
  assert.equal(isRichText('<b>Halo</b>'), true);
});

test('inline formatting tags are stripped', () => {
  assert.equal(
    stripHtmlForSummary('<p>Beli <b>susu</b> dan <i>roti</i></p>'),
    'Beli susu dan roti',
  );
});

test('paragraph breaks survive stripping', () => {
  assert.equal(
    stripHtmlForSummary('<p>Satu</p><p>Dua</p><p>Tiga</p>'),
    'Satu\nDua\nTiga',
  );
});

test('script content never reaches the prompt', () => {
  const out = stripHtmlForSummary('<p>Halo</p><script>alert("x")</script>');
  assert.equal(out.includes('<'), false);
  assert.equal(out.includes('alert'), false);
  assert.equal(out, 'Halo');
});

test('entities and links degrade to readable text', () => {
  const out = stripHtmlForSummary(
    '<p>Lihat <a href="https://example.com">tautan</a> &amp; selesai</p>',
  );
  assert.equal(out.includes('<a'), false);
  assert.equal(out, 'Lihat tautan & selesai');
});
