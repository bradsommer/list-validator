import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

// Development mode bypass - enabled by default in dev
const DEV_AUTH_BYPASS = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS !== 'false';
const DEV_USER = {
  id: 'dev-user-id',
  username: 'admin@example.com',
  displayName: 'Super Admin',
  role: 'super_admin' as const,
  accountId: '00000000-0000-0000-0000-000000000001',
  accountName: 'Default Account',
  isActive: true,
  lastLogin: null,
  createdAt: new Date().toISOString(),
  stripeCustomerId: null,
  subscriptionStatus: 'active',
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Development bypass
    if (DEV_AUTH_BYPASS && token === 'dev-token-12345') {
      return NextResponse.json({ success: true, user: DEV_USER });
    }

    const user = await validateSession(token);

    if (!user) {
      const response = NextResponse.json(
        { success: false, error: 'Session expired' },
        { status: 401 }
      );
      response.cookies.delete('auth_token');
      return response;
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
