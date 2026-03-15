import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Inline the domain config for middleware (Edge Runtime can't import from lib easily)
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const MARKETING_DOMAIN = process.env.NEXT_PUBLIC_MARKETING_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'localhost';
  }
}

const APP_HOSTNAME = getHostname(APP_DOMAIN);
const MARKETING_HOSTNAME = getHostname(MARKETING_DOMAIN);
const DOMAIN_SPLIT_ENABLED = APP_HOSTNAME !== MARKETING_HOSTNAME;

// Prefixes that belong on the marketing site
const MARKETING_PREFIXES = [
  '/contact',
  '/signup',
  '/documentation',
  '/docs',
  '/legal',
  '/forgot-password',
  '/reset-password',
];

// Prefixes that belong on the app site
const APP_PREFIXES = [
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

function matchesAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

export function middleware(request: NextRequest) {
  if (!DOMAIN_SPLIT_ENABLED) {
    return NextResponse.next();
  }

  const hostname = request.headers.get('host')?.split(':')[0] || '';
  const { pathname } = request.nextUrl;

  // Skip API routes and static assets
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const isOnApp = hostname === APP_HOSTNAME;
  const isOnMarketing = hostname === MARKETING_HOSTNAME;

  // If on the marketing domain but hitting an app-only route, redirect to app domain
  if (isOnMarketing && matchesAny(pathname, APP_PREFIXES)) {
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, APP_DOMAIN));
  }

  // If on the app domain but hitting a marketing-only route, redirect to marketing domain
  if (isOnApp && matchesAny(pathname, MARKETING_PREFIXES)) {
    return NextResponse.redirect(new URL(pathname + request.nextUrl.search, MARKETING_DOMAIN));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all paths except static files and api routes
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
