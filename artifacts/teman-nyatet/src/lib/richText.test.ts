import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isRichText,
  richHtmlToText,
  stripTagsFallback,
  scrubHtmlFallback,
  sanitizeRichHtml,
  appendTextToRichContent,
  escapeHtml,
} from '@/lib/richText';

// ── isRichText ────────────────────────────────────────────────────────────────
test('isRichText detects HTML but not plain text', () => {
  assert.equal(isRichText('Halo dunia'), false);
  assert.equal(isRichText('2 < 3 dan 5 > 4'), false);
  assert.equal(isRichText('<b>Halo</b>'), true);
  assert.equal(isRichText('<p>Paragraf</p>'), true);
});

// ── richHtmlToText ────────────────────────────────────────────────────────────
test('richHtmlToText passes plain text through unchanged', () => {
  assert.equal(richHtmlToText('Catatan polos'), 'Catatan polos');
});

test('richHtmlToText strips inline formatting tags', () => {
  assert.equal(richHtmlToText('<b>Bold</b> <i>italic</i>'), 'Bold italic');
});

test('richHtmlToText preserves paragraph breaks', () => {
  assert.equal(
    richHtmlToText('<p>Satu</p><p>Dua</p>'),
    'Satu\nDua',
  );
  assert.equal(richHtmlToText('A<br>B'), 'A\nB');
});

test('richHtmlToText decodes common entities', () => {
  assert.equal(richHtmlToText('<p>AT&amp;T &lt; 5 &amp;&amp; &quot;kuat&quot;</p>'), 'AT&T < 5 && "kuat"');
});

test('richHtmlToText ignores script content', () => {
  assert.equal(
    richHtmlToText('<p>Halo</p><script>alert("x")</script><p>Dunia</p>'),
    'Halo\nDunia',
  );
});

// ── Sanitization (non-DOM fallback path, which is what Node exercises) ────────
test('sanitizeRichHtml leaves plain text untouched', () => {
  assert.equal(sanitizeRichHtml('Catatan polos'), 'Catatan polos');
});

test('scrubHtmlFallback removes scripts and event handlers', () => {
  const input = '<p onclick="steal()">A</p><script>alert(1)</script><img src="x" onerror="alert(2)">';
  const out = scrubHtmlFallback(input);
  assert.equal(out.includes('<script'), false);
  assert.equal(/onerror/i.test(out), false);
  assert.equal(/onclick/i.test(out), false);
});

test('scrubHtmlFallback neutralizes javascript URLs', () => {
  const out = scrubHtmlFallback('<a href="javascript:alert(1)">klik</a>');
  assert.equal(/javascript/i.test(out), false);
});

test('sanitizeRichHtml strips dangerous tags in fallback mode', () => {
  const out = sanitizeRichHtml('<p>Halo</p><iframe src="https://x"></iframe><script>bad()</script>');
  assert.equal(out.includes('<iframe'), false);
  assert.equal(out.includes('<script'), false);
  assert.ok(out.includes('<p>Halo</p>'));
});

// ── appendTextToRichContent ───────────────────────────────────────────────────
test('appendTextToRichContent appends plain text with a newline', () => {
  assert.equal(appendTextToRichContent('A', 'B'), 'A\nB');
  assert.equal(appendTextToRichContent('', 'B'), 'B');
});

test('appendTextToRichContent appends an escaped paragraph to HTML', () => {
  const out = appendTextToRichContent('<p>A</p>', 'B & C');
  assert.equal(out, '<p>A</p><p>B &amp; C</p>');
});

test('appendTextToRichContent keeps multiline dictation intact', () => {
  const out = appendTextToRichContent('<p>A</p>', 'Baris 1\nBaris 2');
  assert.equal(out, '<p>A</p><p>Baris 1<br>Baris 2</p>');
});

test('appendTextToRichContent ignores empty text', () => {
  assert.equal(appendTextToRichContent('A', ''), 'A');
  assert.equal(appendTextToRichContent('<p>A</p>', ''), '<p>A</p>');
});

// ── escapeHtml ────────────────────────────────────────────────────────────────
test('escapeHtml escapes markup characters', () => {
  assert.equal(
    escapeHtml('<b>"x" & \'y\'</b>'),
    '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;',
  );
});

// ── stripTagsFallback ─────────────────────────────────────────────────────────
test('stripTagsFallback is a plain-text fallback for richHtmlToText', () => {
  assert.equal(
    stripTagsFallback('<h1>Judul</h1><p>Isi <b>penting</b></p>'),
    'Judul\nIsi penting',
  );
});
