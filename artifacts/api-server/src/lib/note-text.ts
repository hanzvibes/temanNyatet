/**
 * Plain-text helpers for note content.
 *
 * Note bodies can be stored as plain text (legacy) or as sanitized HTML from
 * the rich-text editor. Server-side consumers that only need the text (e.g.
 * the AI summarizer) go through stripHtmlForSummary so formatting markup
 * never leaks into the prompt.
 */

const RICH_TAG_RE = /<\/?[a-z][\s\S]*?>/i;

export function isRichText(value: string): boolean {
  return RICH_TAG_RE.test(value);
}

/**
 * Convert note content to plain text. Plain-text input passes through
 * unchanged; HTML input loses its tags while paragraph breaks are preserved.
 */
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

export function stripHtmlForSummary(value: string): string {
  if (!isRichText(value)) return value;
  return decodeEntities(
    value
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<\/(p|div|h[1-6]|li|blockquote|tr)>/gi, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s*\n\s*/g, '\n')
      .replace(/\n{3,}/g, '\n\n'),
  ).trim();
}
