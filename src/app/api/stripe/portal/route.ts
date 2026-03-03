import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { validateSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate from session cookie
    const token = request.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const sessionUser = await validateSession(token);
    if (!sessionUser) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Look up stripe_customer_id for the authenticated user
    const { data: dbUser } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', sessionUser.id)
      .single();

    if (!dbUser?.stripe_customer_id) {
      return NextResponse.json(
        { error: 'No billing account found. Please set up a subscription first.' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripe_customer_id,
      return_url: `${baseUrl}/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating portal session:', error);
    return NextResponse.json(
      { error: 'Failed to create billing portal session' },
      { status: 500 }
    );
  }
}
