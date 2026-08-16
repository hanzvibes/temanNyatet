/**
 * Return the public site URL used for email confirmation, password reset, and
 * other auth redirects.
 *
 * Priority:
 * 1. VITE_SITE_URL environment variable (explicit production domain)
 * 2. window.location.origin (works automatically for Replit dev and Vercel previews)
 *
 * This keeps the app free of hardcoded localhost URLs and lets the same build
 * run in development, preview, and production without recompilation.
 */
/**
 * Read VITE_SITE_URL from whichever runtime is active.
 *
 * Vite injects `import.meta.env` in the browser build, but it does not exist in
 * other runtimes (unit tests, SSR), so the optional chain keeps this safe
 * everywhere. Non-Vite runtimes can inject the same variable via process.env.
 */
function getConfiguredSiteUrl(): string | undefined {
  const viteValue = (import.meta as { env?: Record<string, unknown> }).env?.VITE_SITE_URL;
  if (typeof viteValue === 'string' && viteValue.trim()) {
    return viteValue.trim();
  }
  if (typeof process !== 'undefined') {
    const procValue = (process.env as Record<string, string | undefined>).VITE_SITE_URL;
    if (typeof procValue === 'string' && procValue.trim()) {
      return procValue.trim();
    }
  }
  return undefined;
}

export function getSiteUrl(): string {
  const configured = getConfiguredSiteUrl();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  return '';
}

/**
 * Build an absolute redirect URL for Supabase auth emails.
 */
export function getEmailRedirectUrl(path = '/login'): string {
  const siteUrl = getSiteUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteUrl}${normalizedPath}`;
}
