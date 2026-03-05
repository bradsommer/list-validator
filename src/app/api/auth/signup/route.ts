import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/passwordValidation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

/**
 * POST /api/auth/signup
 * 1. Create user account
 * 2. Log them in (set session cookie)
 * 3. Create Stripe checkout session
 * 4. Return checkout URL
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return NextResponse.json(
        { success: false, error: pwCheck.error },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if account already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('username', normalizedEmail)
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
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create a new account (tenant) for this signup
    const accountName = displayName
      ? `${displayName}'s Account`
      : normalizedEmail.split('@')[0] + "'s Account";
    const accountSlug = normalizedEmail.replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({
        name: accountName,
        slug: accountSlug,
      })
      .select()
      .single();

    if (accountError || !account) {
      console.error('Account creation error:', accountError);
      return NextResponse.json(
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create user linked to the new account
    const { data: user, error: createError } = await supabase
      .from('users')
      .insert({
        username: normalizedEmail,
        password_hash: passwordHash,
        display_name: displayName || null,
        role: 'admin',
        account_id: account.id,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists. Please sign in.' },
          { status: 409 }
        );
      }
      console.error('Create error:', createError);
      return NextResponse.json(
        { success: false, error: 'Failed to create account' },
        { status: 500 }
      );
    }

    // Create session token
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await supabase.from('user_sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    // Create Stripe checkout session with user ID metadata for webhook linking
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: normalizedEmail,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
        metadata: { user_id: user.id },
      },
      metadata: { user_id: user.id },
      success_url: `${baseUrl}/?welcome=true`,
      cancel_url: `${baseUrl}/?checkout=cancelled`,
      allow_promotion_codes: true,
    });

    const response = NextResponse.json({
      success: true,
      checkoutUrl: checkoutSession.url,
    });

    // Set auth cookie so user is logged in when they return from Stripe
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during signup' },
      { status: 500 }
    );
  }
}
