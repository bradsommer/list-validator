import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
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

    // Admins can always log in. For other users, check subscription status.
    if (result.user && result.user.role !== 'company_admin' && result.user.role !== 'admin') {
      const { data: dbUser } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', result.user.id)
        .single();

      if (dbUser?.subscription_status === 'canceled' || dbUser?.subscription_status === 'cancelled') {
        return NextResponse.json(
          { success: false, error: 'Your subscription has been cancelled. Please contact support or resubscribe.' },
          { status: 403 }
        );
      }
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
