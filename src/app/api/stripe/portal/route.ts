import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { validateSession } from '@/lib/auth';
import { getServerSupabase } from '@/lib/supabase';

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
    const { data: dbUser } = await getServerSupabase()
      .from('users')
      .select('stripe_customer_id, stripe_subscription_id, username, account_id')
      .eq('id', sessionUser.id)
      .single();

    let stripeCustomerId = dbUser?.stripe_customer_id;

    // If no stripe_customer_id but we have a subscription ID, look up customer from the subscription
    if (!stripeCustomerId && dbUser?.stripe_subscription_id) {
      try {
        const subscription = await stripe.subscriptions.retrieve(dbUser.stripe_subscription_id);
        const customerId = typeof subscription.customer === 'string'
          ? subscription.customer
          : subscription.customer.id;
        if (customerId) {
          stripeCustomerId = customerId;
          // Save it for next time
          await getServerSupabase()
            .from('users')
            .update({ stripe_customer_id: stripeCustomerId })
            .eq('id', sessionUser.id);
        }
      } catch (subErr) {
        console.error('Failed to look up subscription in Stripe:', subErr);
      }
    }

    // If no stripe_customer_id saved (webhook may not have fired), look up by email in Stripe
    if (!stripeCustomerId && dbUser?.username) {
      const customers = await stripe.customers.list({
        email: dbUser.username,
        limit: 1,
      });

      if (customers.data.length > 0) {
        stripeCustomerId = customers.data[0].id;

        // Save it for next time so we don't need to look it up again
        await getServerSupabase()
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', sessionUser.id);
      }
    }

    // If still no customer ID, check other users in the same account
    // This allows billing-permissioned users to manage the account's subscription
    if (!stripeCustomerId && dbUser?.account_id) {
      const { data: accountUsers } = await getServerSupabase()
        .from('users')
        .select('stripe_customer_id, stripe_subscription_id')
        .eq('account_id', dbUser.account_id)
        .limit(10);

      // First try users with a stripe_customer_id
      const withCustomerId = accountUsers?.find(u => u.stripe_customer_id);
      if (withCustomerId?.stripe_customer_id) {
        stripeCustomerId = withCustomerId.stripe_customer_id;
      } else {
        // Try looking up via any account user's subscription ID
        const withSubId = accountUsers?.find(u => u.stripe_subscription_id);
        if (withSubId?.stripe_subscription_id) {
          try {
            const subscription = await stripe.subscriptions.retrieve(withSubId.stripe_subscription_id);
            const customerId = typeof subscription.customer === 'string'
              ? subscription.customer
              : subscription.customer.id;
            if (customerId) {
              stripeCustomerId = customerId;
            }
          } catch (subErr) {
            console.error('Failed to look up account subscription in Stripe:', subErr);
          }
        }
      }
    }

    if (!stripeCustomerId) {
      console.error('Billing portal: no Stripe customer found for user', {
        userId: sessionUser.id,
        username: dbUser?.username,
        hasSubscriptionId: !!dbUser?.stripe_subscription_id,
        accountId: dbUser?.account_id,
      });
      return NextResponse.json(
        { error: 'No billing account found. Please set up a subscription first.' },
        { status: 404 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    let session;
    try {
      session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: `${baseUrl}/billing`,
      });
    } catch (stripeError: unknown) {
      const msg = stripeError instanceof Error ? stripeError.message : String(stripeError);
      console.error('Stripe billing portal error:', msg);

      // Provide actionable error for common portal issues
      if (msg.includes('portal') || msg.includes('configuration')) {
        return NextResponse.json(
          { error: 'The billing portal is not configured yet. Please contact support.' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create billing portal session. Please try again or contact support.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error in portal endpoint:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
