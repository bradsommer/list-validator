import { NextRequest, NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase';

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

    // Check subscription status for non-admin users
    let subscriptionInactive = false;
    if (result.user && result.user.role !== 'super_admin' && result.user.role !== 'company_admin' && result.user.role !== 'admin') {
      const { data: dbUser } = await getServerSupabase()
        .from('users')
        .select('subscription_status, subscription_cancelled_at')
        .eq('id', result.user.id)
        .single();

      if (dbUser?.subscription_status === 'canceled' || dbUser?.subscription_status === 'cancelled') {
        // If cancelled more than 45 days ago, block login entirely
        if (dbUser.subscription_cancelled_at) {
          const cancelledAt = new Date(dbUser.subscription_cancelled_at);
          const daysSinceCancelled = (Date.now() - cancelledAt.getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceCancelled > 45) {
            return NextResponse.json(
              { success: false, error: 'Your account has been deactivated. Please contact support.' },
              { status: 403 }
            );
          }
        }
        subscriptionInactive = true;
      }
    }

    // Create response with token in cookie
    const response = NextResponse.json({
      success: true,
      user: result.user,
      accounts: result.accounts || undefined,
      subscriptionInactive,
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
