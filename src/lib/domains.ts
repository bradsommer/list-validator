/**
 * Domain configuration for split hosting:
 * - Marketing/pre-login pages: freshsegments.com (MARKETING_DOMAIN)
 * - App portal + login: app.freshsegments.com (APP_DOMAIN)
 */

// The app (portal + login) domain — defaults to NEXT_PUBLIC_APP_URL for local dev
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || baseUrl;
export const MARKETING_DOMAIN = process.env.NEXT_PUBLIC_MARKETING_DOMAIN || baseUrl;

// Hostnames (without protocol) for middleware matching
export const APP_HOSTNAME = new URL(APP_DOMAIN).hostname;       // e.g. "app.freshsegments.com"
export const MARKETING_HOSTNAME = new URL(MARKETING_DOMAIN).hostname; // e.g. "freshsegments.com"

// Routes that belong on the marketing site (freshsegments.com)
export const MARKETING_ROUTES = [
  '/contact',
  '/signup',
  '/documentation',
  '/docs',
  '/legal',
  '/forgot-password',
  '/reset-password',
];

// Routes that belong on the app site (app.freshsegments.com)
// The root "/" is special — it serves landing on marketing, dashboard on app
export const APP_ROUTES = [
  '/login',
  '/select-account',
  '/accept-invite',
  '/setup-account',
  '/import',
  '/rules',
  '/column-headings',
  '/import-questions',
  '/history',
  '/billing',
  '/contacts',
  '/companies',
  '/deals',
  '/settings',
  '/admin',
  '/company-admin',
];

/** Check if a pathname belongs to the marketing site */
export function isMarketingRoute(pathname: string): boolean {
  if (pathname === '/') return true;
  return MARKETING_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

/** Check if a pathname belongs to the app site */
export function isAppRoute(pathname: string): boolean {
  if (pathname === '/') return true; // root is valid on both (landing vs dashboard)
  return APP_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

/**
 * Returns true when the two domains are actually different.
 * In local dev, both point to localhost so domain splitting is disabled.
 */
export function isDomainSplitEnabled(): boolean {
  return APP_HOSTNAME !== MARKETING_HOSTNAME;
}

/** Build a full URL on the marketing domain */
export function marketingUrl(path: string): string {
  return `${MARKETING_DOMAIN}${path}`;
}

/** Build a full URL on the app domain */
export function buildAppUrl(path: string): string {
  return `${APP_DOMAIN}${path}`;
}
