import { NextRequest, NextResponse } from 'next/server';
import { createUser } from '@/lib/auth';

// Development mode bypass
const DEV_AUTH_BYPASS = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS !== 'false';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Development bypass - skip signup in dev mode, user should use dev credentials
    if (DEV_AUTH_BYPASS) {
      // In dev mode, we don't actually create users - just return success
      // so the Stripe flow can be tested. User will need to use dev credentials
      // (admin@example.com / admin123) to log in after Stripe checkout.
      const devUser = {
        id: `dev-user-${Date.now()}`,
        username: email.toLowerCase().trim(),
        displayName: email.split('@')[0],
        role: 'user' as const,
        isActive: true,
        lastLogin: null,
        createdAt: new Date().toISOString(),
        stripeCustomerId: null,
        subscriptionStatus: null,
      };

      return NextResponse.json({
        success: true,
        user: devUser,
      });
    }

    // Create user in database
    const result = await createUser(
      email.toLowerCase().trim(),
      password,
      email.split('@')[0], // Use part before @ as display name
      'user'
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result.user,
    });
  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
