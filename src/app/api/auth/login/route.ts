import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';

// Development mode bypass - enabled by default in dev, set DEV_AUTH_BYPASS=false to disable
const DEV_AUTH_BYPASS = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS !== 'false';
const DEV_USER = {
  id: 'dev-user-id',
  username: 'admin@example.com',
  displayName: 'Administrator',
  role: 'admin' as const,
  isActive: true,
  lastLogin: null,
  createdAt: new Date().toISOString(),
};

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Development bypass for testing without Supabase
    if (DEV_AUTH_BYPASS) {
      if (username === 'admin@example.com' && password === 'admin123') {
        const response = NextResponse.json({
          success: true,
          user: DEV_USER,
        });
        response.cookies.set('auth_token', 'dev-token-12345', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 24 * 60 * 60,
          path: '/',
        });
        return response;
      }
      return NextResponse.json(
        { success: false, error: 'Invalid credentials (dev mode: admin@example.com / admin123)' },
        { status: 401 }
      );
    }

    const result = await loginUser(username, password);

    if (!result.success) {
      console.error('Login failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Create response with token in cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
    });

    // Set HTTP-only cookie for security
    response.cookies.set('auth_token', result.token!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during login. Check if Supabase is configured correctly.' },
      { status: 500 }
    );
  }
}
