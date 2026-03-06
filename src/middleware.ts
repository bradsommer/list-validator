import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PREVIEW_ACCESS_KEY = 'fs_preview_access';
const PREVIEW_ACCESS_VALUE = 'freshsegments2026';

// Public pages that should show "Coming Soon" unless the user has preview access
const GATED_PATHS = ['/login', '/signup', '/forgot-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only gate specific public-facing paths
  if (!GATED_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // Check for access via query param
  const accessParam = request.nextUrl.searchParams.get('access');
  if (accessParam === PREVIEW_ACCESS_VALUE) {
    const response = NextResponse.next();
    response.cookies.set(PREVIEW_ACCESS_KEY, PREVIEW_ACCESS_VALUE, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  // Check for access via cookie
  const accessCookie = request.cookies.get(PREVIEW_ACCESS_KEY);
  if (accessCookie?.value === PREVIEW_ACCESS_VALUE) {
    return NextResponse.next();
  }

  // No access — redirect to home (which shows Coming Soon)
  return NextResponse.redirect(new URL('/', request.url));
}

export const config = {
  matcher: ['/login', '/signup', '/forgot-password'],
};
