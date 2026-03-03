import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * GET /api/auth/setup-account?session_id=xxx
 * Retrieve the email from a completed Stripe checkout session
 */
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== 'complete') {
      return NextResponse.json(
        { success: false, error: 'Checkout session is not complete' },
        { status: 400 }
      );
    }

    const email = session.customer_details?.email;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'No email found for this session' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ success: true, email });
  } catch (error) {
    console.error('Setup account GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify checkout session' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/setup-account
 * Create a new user account after Stripe checkout
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionId, password, displayName } = await request.json();

    if (!sessionId || !password) {
      return NextResponse.json(
        { success: false, error: 'Session ID and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Verify the Stripe session
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.status !== 'complete') {
      return NextResponse.json(
        { success: false, error: 'Checkout session is not complete' },
        { status: 400 }
      );
    }

    const email = session.customer_details?.email;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'No email found for this session' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', email.toLowerCase().trim())
      .single();

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists. Please sign in.' },
        { status: 409 }
      );
    }

    // Hash password
    const { data: passwordHash, error: hashError } = await supabase.rpc('hash_password', {
      password,
    });

    if (hashError || !passwordHash) {
      console.error('Hash error:', hashError);
      return NextResponse.json(
        { success: false, error: 'Failed to set up account' },
        { status: 500 }
      );
    }

    // Create user account
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        username: email.toLowerCase().trim(),
        password_hash: passwordHash,
        display_name: displayName || null,
        role: 'admin',
        is_active: true,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_status: 'active',
        subscription_trial_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (createError) {
      console.error('Create error:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create session token so user is logged in immediately
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await supabase.from('user_sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        isActive: user.is_active,
        lastLogin: null,
        createdAt: user.created_at,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Setup account POST error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred while setting up your account' },
      { status: 500 }
    );
  }
}
