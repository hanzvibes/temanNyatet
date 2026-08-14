const URL_PATTERN = /\bhttps?:\/\/[^\s<>"'`]+/gi;
const FETCH_TIMEOUT_MS = 4_000;
const MAX_HTML_BYTES = 512_000;

export function extractHttpUrls(...values: unknown[]): string[] {
  const unique = new Map<string, string>();

  for (const value of values) {
    if (typeof value !== 'string') continue;
    for (const raw of value.match(URL_PATTERN) ?? []) {
      const cleaned = raw.replace(/[),.;!?]+$/g, '');
      try {
        const parsed = new URL(cleaned);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
        // URL normalization makes equivalent links (e.g. trailing slash)
        // share one Linksaver entry without changing what the note contains.
        parsed.hash = '';
        const normalized = parsed.toString().replace(/\/$/, '');
        unique.set(normalized, cleaned);
      } catch {
        // Ignore malformed URL-like text; note saving must remain unaffected.
      }
    }
  }

  return [...unique.keys()];
}

function isSafeMetadataUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      host !== 'localhost' &&
      host !== '::1' &&
      !host.endsWith('.local') &&
      !/^(10|127|169\.254|192\.168)\./.test(host) &&
      !/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    );
  } catch {
    return false;
  }
}

async function readPageTitle(url: string): Promise<string | null> {
  if (!isSafeMetadataUrl(url)) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'TemanNyatet-LinkMetadata/1.0',
      },
    });
    if (!response.ok) return null;
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('xhtml')) return null;
    const html = (await response.text()).slice(0, MAX_HTML_BYTES);
    const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (!match?.[1]) return null;
    const title = match[1]
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .trim();
    return title.slice(0, 200) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Tautan dari catatan';
  }
}

/**
 * Best-effort sync: note persistence owns the request. Metadata/network
 * failures are logged by the caller and never make the note save fail.
 */
export async function syncNoteLinks(
  userId: string,
  title: unknown,
  content: unknown,
  log?: { warn: (fields: Record<string, unknown>, message: string) => void },
): Promise<number> {
  const urls = extractHttpUrls(title, content);
  if (urls.length === 0) return 0;

  // Import lazily so loading this module (e.g. for the pure extractHttpUrls
  // tests) does not require a database connection at import time. The server
  // still resolves the data store normally when sync actually runs.
  const { createData, listData } = await import('./data-store.js');
  const existing = await listData('links', userId);
  const existingUrls = new Set(
    existing
      .map((row) => (typeof row.url === 'string' ? row.url : null))
      .filter((url): url is string => Boolean(url))
      .map((url) => {
        try {
          const parsed = new URL(url);
          parsed.hash = '';
          return parsed.toString().replace(/\/$/, '');
        } catch {
          return url;
        }
      }),
  );

  const newUrls = urls.filter((url) => !existingUrls.has(url));
  const metadata = await Promise.all(
    newUrls.map(async (url) => ({ url, title: (await readPageTitle(url)) ?? fallbackTitle(url) })),
  );
  await Promise.all(
    metadata.map(({ url, title }) =>
      createData('links', userId, { title, url, note: '' }),
    ),
  );
  const added = metadata.length;
  log?.warn({ userId, extracted: urls.length, added }, 'Automatic note links synced');
  return added;
}