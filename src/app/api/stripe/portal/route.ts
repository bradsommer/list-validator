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
      .select('stripe_customer_id, username, account_id')
      .eq('id', sessionUser.id)
      .single();

    let stripeCustomerId = dbUser?.stripe_customer_id;

    // If no stripe_customer_id saved (webhook may not have fired), look up by email in Stripe
    if (!stripeCustomerId && dbUser?.username) {
      const customers = await stripe.customers.list({
        email: dbUser.username,
        limit: 1,
      });

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;

        // Save it for next time so we don't need to look it up again
        await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', sessionUser.id);
      }
    }

    // If still no customer ID, check other users in the same account
    // This allows billing-permissioned users to manage the account's subscription
    if (!stripeCustomerId && dbUser?.account_id) {
      const { data: accountUser } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('account_id', dbUser.account_id)
        .not('stripe_customer_id', 'is', null)
        .limit(1)
        .single();

      if (accountUser?.stripe_customer_id) {
        stripeCustomerId = accountUser.stripe_customer_id;
      }
    }

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please set up a subscription first.' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
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
