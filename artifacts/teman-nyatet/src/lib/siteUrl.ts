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
export function getSiteUrl(): string {
  const configured = import.meta.env.VITE_SITE_URL as string | undefined;
  if (configured && typeof configured === 'string' && configured.trim()) {
    return configured.trim().replace(/\/$/, '');
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
