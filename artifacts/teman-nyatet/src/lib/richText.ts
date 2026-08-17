// Rich-text helpers for note content.
//
// Notes store their body in `content` as either:
//   - plain text (legacy notes, and any note the user never formatted), or
//   - sanitized HTML produced by the RichTextEditor.
//
// Everything that consumes note content routes through these helpers so both
// formats behave identically (search, card previews, AI summary, voice notes).

const RICH_TAG_RE = /<\/?[a-z][\s\S]*?>/i;

/** True when the string looks like HTML (has at least one tag). */
export function isRichText(content: string): boolean {
  return RICH_TAG_RE.test(content);
}

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (match) => ENTITY_MAP[match] ?? match)
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCodePoint(Number(code));
      } catch {
        return '';
      }
    });
}

/** Regex tag stripper used when DOMParser is unavailable (e.g. Node tests). */
export function stripTagsFallback(html: string): string {
  return decodeEntities(
    html
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      // Block-level ends become line breaks so paragraph structure survives.
      .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n'),
  ).trim();
}

/**
 * Convert note content to plain text. Used for search, card previews, and the
 * AI summary payload so formatting markup never leaks into user-facing text.
 */
export function richHtmlToText(content: string): string {
  if (!isRichText(content)) return content;
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(content, 'text/html');
      const body = doc.body;
      if (body) {
        // Preserve paragraph separation: textContent concatenates everything,
        // so append a newline after every block boundary first.
        body
          .querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote, tr, br')
          .forEach((el) => el.insertAdjacentText('afterend', '\n'));
        return body.textContent?.replace(/\n{3,}/g, '\n\n').trim() ?? '';
      }
    } catch {
      // Fall through to the regex path.
    }
  }
  return stripTagsFallback(content);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Append dictated voice text to note content. When the note is stored as HTML
 * the text is escaped and appended as a new paragraph; plain-text notes get a
 * simple newline join.
 */
export function appendTextToRichContent(content: string, text: string): string {
  if (!text) return content;
  if (isRichText(content)) {
    return `${content}<p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>`;
  }
  return content ? `${content}\n${text}` : text;
}

// ── Sanitization ──────────────────────────────────────────────────────────────
// The editor is contentEditable, so pasted content is the main risk surface.
// Browsers already strip scripts from paste, but we keep a whitelist sanitizer
// at every boundary (editor load, save, read-mode render) so a crafted payload
// can never execute.

const ALLOWED_TAGS = new Set([
  'P', 'DIV', 'BR', 'SPAN', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'DEL', 'MARK', 'UL', 'OL', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5',
  'H6', 'A', 'PRE', 'CODE', 'SUB', 'SUP', 'SMALL', 'HR',
]);

const DANGEROUS_TAGS = new Set([
  'SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'FORM',
  'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'STYLE', 'TEMPLATE',
]);

const ALLOWED_ATTRS = new Set(['href', 'style']);

const FORBIDDEN_STYLE_RE =
  /(?:expression|javascript|vbscript|url\s*\()|(?:-moz-binding)/i;

/**
 * Sanitize rich-text HTML to a safe whitelist subset. Non-DOM environments
 * (Node tests) get the conservative regex scrub instead.
 */
export function sanitizeRichHtml(html: string): string {
  if (!html || !isRichText(html)) return html;
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      if (!doc.body) return scrubHtmlFallback(html);

      // Collect elements first, then process bottom-up so removing or
      // unwrapping a parent does not invalidate the walk.
      const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT);
      const elements: Element[] = [];
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        elements.push(node as Element);
      }

      for (const el of elements.reverse()) {
        const tag = el.tagName;
        if (DANGEROUS_TAGS.has(tag)) {
          el.remove();
          continue;
        }
        if (!ALLOWED_TAGS.has(tag)) {
          // Unwrap unknown elements, keeping their (sanitized) children.
          el.replaceWith(...Array.from(el.childNodes));
          continue;
        }
        for (const attr of Array.from(el.attributes)) {
          const name = attr.name.toLowerCase();
          if (!ALLOWED_ATTRS.has(name)) {
            el.removeAttribute(attr.name);
            continue;
          }
          if (name === 'style') {
            if (FORBIDDEN_STYLE_RE.test(attr.value)) {
              el.removeAttribute('style');
              continue;
            }
            // Keep only color / background styling — everything else (layout,
            // position, size) is stripped so pasted markup cannot restyle the
            // editor or the read view.
            const cleaned = attr.value
              .split(';')
              .map((s) => s.trim())
              .filter((s) => /^(color|background-color|background)\s*:/i.test(s))
              .join(';');
            if (cleaned) el.setAttribute('style', cleaned);
            else el.removeAttribute('style');
          }
          if (name === 'href') {
            const href = attr.value.trim().toLowerCase();
            if (!/^(https?:|mailto:|tel:|#)/.test(href)) el.removeAttribute('href');
          }
        }
      }
      return doc.body.innerHTML;
    } catch {
      return scrubHtmlFallback(html);
    }
  }
  return scrubHtmlFallback(html);
}

/** Conservative regex scrub — only used where DOMParser is unavailable. */
export function scrubHtmlFallback(html: string): string {
  return html
    .replace(
      /<(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select|style|template)[\s\S]*?<\/(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select|style|template)>/gi,
      '',
    )
    .replace(
      /<(script|iframe|object|embed|link|meta|base|form|input|button|textarea|select|style|template)[^>]*\/?>/gi,
      '',
    )
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(javascript|vbscript)\s*:/gi, '');
}

// ── Color palettes for the editor toolbar ─────────────────────────────────────

export interface ColorOption {
  label: string;
  value: string; // '' means "remove / inherit"
  swatch: string; // CSS color used for the picker swatch
}

export const TEXT_COLOR_OPTIONS: ColorOption[] = [
  { label: 'Default', value: '', swatch: 'transparent' },
  { label: 'Abu-abu', value: '#6b7280', swatch: '#6b7280' },
  { label: 'Merah', value: '#dc2626', swatch: '#dc2626' },
  { label: 'Oranye', value: '#ea580c', swatch: '#ea580c' },
  { label: 'Kuning', value: '#ca8a04', swatch: '#ca8a04' },
  { label: 'Hijau', value: '#16a34a', swatch: '#16a34a' },
  { label: 'Teal', value: '#0d9488', swatch: '#0d9488' },
  { label: 'Biru', value: '#2563eb', swatch: '#2563eb' },
  { label: 'Indigo', value: '#4f46e5', swatch: '#4f46e5' },
  { label: 'Ungu', value: '#7c3aed', swatch: '#7c3aed' },
  { label: 'Pink', value: '#db2777', swatch: '#db2777' },
  { label: 'Putih', value: '#ffffff', swatch: '#ffffff' },
];

export const HIGHLIGHT_COLOR_OPTIONS: ColorOption[] = [
  { label: 'Tanpa highlight', value: '', swatch: 'transparent' },
  { label: 'Kuning', value: '#fef08a', swatch: '#fef08a' },
  { label: 'Hijau muda', value: '#bbf7d0', swatch: '#bbf7d0' },
  { label: 'Biru muda', value: '#bfdbfe', swatch: '#bfdbfe' },
  { label: 'Pink muda', value: '#fbcfe8', swatch: '#fbcfe8' },
  { label: 'Oranye muda', value: '#fed7aa', swatch: '#fed7aa' },
  { label: 'Ungu muda', value: '#ddd6fe', swatch: '#ddd6fe' },
  { label: 'Mint', value: '#a7f3d0', swatch: '#a7f3d0' },
];
