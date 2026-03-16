import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getServerSupabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

/**
 * GET /api/auth/stripe-return?session_id=cs_xxx
 *
 * Called when the user returns from Stripe checkout.
 * Looks up the checkout session, finds the user from metadata,
 * creates/refreshes an auth session, sets the cookie, and redirects
 * to the dashboard. This ensures the user is always authenticated
 * on the correct domain after checkout — even if the original
 * signup cookie was set on a different domain.
 */
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const sessionId = request.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.redirect(new URL('/login', baseUrl));
    }

    // Retrieve the Stripe checkout session to get the user_id from metadata
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
    const userId = checkoutSession.metadata?.user_id;

    if (!userId) {
      console.error('Stripe return: no user_id in checkout session metadata');
      return NextResponse.redirect(new URL('/login', baseUrl));
    }

    // Verify the user exists
    const { data: user } = await getServerSupabase()
      .from('users')
      .select('id, is_active')
      .eq('id', userId)
      .single();

    if (!user || !user.is_active) {
      return NextResponse.redirect(new URL('/login', baseUrl));
    }

    // Check if the user already has a valid session (from signup cookie)
    const existingToken = request.cookies.get('auth_token')?.value;
    if (existingToken) {
      const { data: existingSession } = await getServerSupabase()
        .from('user_sessions')
        .select('user_id')
        .eq('token', existingToken)
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (existingSession) {
        // Cookie is already valid for this user — just redirect
        return NextResponse.redirect(new URL('/?welcome=true', baseUrl));
      }
    }

    // Create a new session for the user
    const tokenArray = new Uint8Array(32);
    crypto.getRandomValues(tokenArray);
    const token = Array.from(tokenArray, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await getServerSupabase().from('user_sessions').insert({
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
    });

    // Set the auth cookie and redirect to dashboard
    const response = NextResponse.redirect(new URL('/?welcome=true', baseUrl));
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Stripe return error:', error);
    return NextResponse.redirect(new URL('/login', baseUrl));
  }
}
