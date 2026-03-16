import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSupabase } from '@/lib/supabase';
import { validatePassword } from '@/lib/passwordValidation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

/** Map ISO country code to data residency region */
function countryToRegion(countryCode: string): 'us' | 'eu' | 'ch' {
  if (countryCode === 'CH') return 'ch';
  const euCountries = ['AT', 'BE', 'DE', 'DK', 'ES', 'FI', 'FR', 'GB', 'IE', 'IT', 'NL', 'NO', 'PL', 'PT', 'SE'];
  if (euCountries.includes(countryCode)) return 'eu';
  return 'us';
}

/**
 * POST /api/auth/signup
 * 1. Create user account
 * 2. Log them in (set session cookie)
 * 3. Create Stripe checkout session
 * 4. Return checkout URL
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, companyName, country, marketingOptIn } = await request.json();

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
    const supabase = getServerSupabase();

    // Check if user already exists with this email (multi-account support)
    // Use maybeSingle() to avoid errors when no rows match
    const { data: existingUsers } = await getServerSupabase()
      .from('users')
      .select('id, password_hash, stripe_customer_id')
      .eq('username', normalizedEmail)
      .not('password_hash', 'is', null)
      .limit(1);

    const existingUser = existingUsers?.[0] || null;

    // If the email already exists, verify the password matches before creating a new account
    if (existingUser) {
      const { data: passwordMatch, error: verifyError } = await getServerSupabase().rpc('verify_password', {
        password,
        password_hash: existingUser.password_hash,
      });
      if (verifyError) {
        console.error('Password verification error:', verifyError);
        return NextResponse.json(
          { success: false, error: 'Failed to verify credentials. Please try again.' },
          { status: 500 }
        );
      }
      if (!passwordMatch) {
        return NextResponse.json(
          { success: false, error: 'An account with this email already exists. Please enter your existing password to create an additional account, or sign in.' },
          { status: 409 }
        );
      }
    }

    // Hash password
    const { data: passwordHash, error: hashError } = await getServerSupabase().rpc('hash_password', {
      password,
    });

    if (hashError || !passwordHash) {
      console.error('Hash error:', hashError);
      return NextResponse.json(
        { success: false, error: 'Failed to secure account credentials. Please try again.' },
        { status: 500 }
      );
    }

    // Create a new account (tenant) for this signup
    const fullName = [firstName, lastName].filter(Boolean).join(' ');
    const accountName = companyName?.trim()
      || (fullName ? `${fullName}'s Account` : normalizedEmail.split('@')[0] + "'s Account");
    const accountSlug = normalizedEmail.replace(/[^a-z0-9]/g, '-') + '-' + Date.now();

    const region = countryToRegion(country || '');

    // Try with region column first; if the migration hasn't been applied yet, retry without it
    let account: { id: string } | null = null;
    const { data: accountData, error: accountError } = await getServerSupabase()
      .from('accounts')
      .insert({
        name: accountName,
        slug: accountSlug,
        region,
      })
      .select()
      .single();

    if (accountError) {
      console.error('Account creation error (with region):', accountError);
      // Retry without region in case the column doesn't exist yet
      const { data: retryData, error: retryError } = await getServerSupabase()
        .from('accounts')
        .insert({
          name: accountName,
          slug: accountSlug + '-r',
        })
        .select()
        .single();

      if (retryError || !retryData) {
        console.error('Account creation error (without region):', retryError);
        return NextResponse.json(
          { success: false, error: 'Failed to create account workspace. Please try again.' },
          { status: 500 }
        );
      }
      account = retryData;
    } else {
      account = accountData;
    }

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Failed to create account workspace. Please try again.' },
        { status: 500 }
      );
    }

    // Create user linked to the new account
    // Try with marketing_opt_in columns first; retry without if migration hasn't been applied yet
    let user: { id: string } | null = null;
    const { data: userData, error: createError } = await getServerSupabase()
      .from('users')
      .insert({
        username: normalizedEmail,
        password_hash: passwordHash,
        first_name: firstName || null,
        last_name: lastName || null,
        role: 'admin',
        account_id: account.id,
        is_active: true,
        marketing_opt_in: !!marketingOptIn,
        marketing_opt_in_at: marketingOptIn ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (createError) {
      if (createError.code === '23505') {
        return NextResponse.json(
          { success: false, error: 'This email is already linked to this account.' },
          { status: 409 }
        );
      }
      console.error('User creation error (with marketing columns):', createError);
      // Retry without marketing columns in case the migration hasn't been applied yet
      const { data: retryData, error: retryError } = await getServerSupabase()
        .from('users')
        .insert({
          username: normalizedEmail,
          password_hash: passwordHash,
          first_name: firstName || null,
          last_name: lastName || null,
          role: 'admin',
          account_id: account.id,
          is_active: true,
        })
        .select()
        .single();

      if (retryError) {
        if (retryError.code === '23505') {
          return NextResponse.json(
            { success: false, error: 'This email is already linked to this account.' },
            { status: 409 }
          );
        }
        console.error('User creation error (without marketing columns):', retryError);
        return NextResponse.json(
          { success: false, error: 'Failed to create user profile. Please try again.' },
          { status: 500 }
        );
      }
      user = retryData;
    } else {
      user = userData;
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user profile. Please try again.' },
        { status: 500 }
      );
    }

    // Create session token
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await getServerSupabase().from('user_sessions').insert({
      user_id: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    });

    // Create Stripe checkout session with user ID metadata for webhook linking
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Reuse existing Stripe customer if this email already has one
    let existingStripeCustomerId = existingUser?.stripe_customer_id || null;
    if (!existingStripeCustomerId) {
      // The first user row we checked might not have had a stripe_customer_id;
      // look across all rows for this email
      const { data: stripeRow } = await getServerSupabase()
        .from('users')
        .select('stripe_customer_id')
        .eq('username', normalizedEmail)
        .not('stripe_customer_id', 'is', null)
        .limit(1);
      existingStripeCustomerId = stripeRow?.[0]?.stripe_customer_id || null;
    }

    const checkoutParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
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
    };

    if (existingStripeCustomerId) {
      // Reuse the same Stripe customer so all subscriptions are under one customer
      checkoutParams.customer = existingStripeCustomerId;
    } else {
      // New customer — pre-fill the email
      checkoutParams.customer_email = normalizedEmail;
    }

    let checkoutUrl: string | null = null;
    try {
      const checkoutSession = await stripe.checkout.sessions.create(checkoutParams);
      checkoutUrl = checkoutSession.url;
    } catch (stripeError) {
      console.error('Stripe checkout error:', stripeError);
      // If reusing an existing customer failed, retry without the customer ID
      if (existingStripeCustomerId) {
        console.log('Retrying Stripe checkout without existing customer ID');
        delete checkoutParams.customer;
        checkoutParams.customer_email = normalizedEmail;
        const retrySession = await stripe.checkout.sessions.create(checkoutParams);
        checkoutUrl = retrySession.url;
      } else {
        throw stripeError;
      }
    }

    if (!checkoutUrl) {
      console.error('Stripe returned null checkout URL');
      return NextResponse.json(
        { success: false, error: 'Failed to create checkout session. Please try again.' },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      success: true,
      checkoutUrl,
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
