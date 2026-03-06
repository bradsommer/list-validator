import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { validateSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(request: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Check if user is authenticated (resubscribe flow)
    const token = request.cookies.get('auth_token')?.value;
    let userId: string | undefined;
    let customerEmail: string | undefined;
    let stripeCustomerId: string | undefined;

    if (token) {
      const sessionUser = await validateSession(token);
      if (sessionUser) {
        userId = sessionUser.id;
        customerEmail = sessionUser.username;

        // Look up existing Stripe customer ID
        const { data: dbUser } = await supabase
          .from('users')
          .select('stripe_customer_id')
          .eq('id', sessionUser.id)
          .single();

        if (dbUser?.stripe_customer_id) {
          stripeCustomerId = dbUser.stripe_customer_id;
        }
      }
    }

    // Build checkout session params
    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/?welcome=true`,
      cancel_url: `${baseUrl}?checkout=cancelled`,
      allow_promotion_codes: true,
    };

    // Resubscribe: attach existing customer and user metadata, no trial
    if (stripeCustomerId) {
      params.customer = stripeCustomerId;
      params.metadata = { user_id: userId! };
      params.subscription_data = { metadata: { user_id: userId! } };
    } else if (customerEmail) {
      // Authenticated but no Stripe customer yet
      params.customer_email = customerEmail;
      params.metadata = { user_id: userId! };
      params.subscription_data = {
        trial_period_days: 14,
        metadata: { user_id: userId! },
      };
    } else {
      // Unauthenticated (original signup flow handles this via signup route)
      params.subscription_data = { trial_period_days: 14 };
    }

    const session = await stripe.checkout.sessions.create(params);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
