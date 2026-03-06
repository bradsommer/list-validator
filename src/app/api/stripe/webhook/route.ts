import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-01-28.clover',
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;
        const userId = session.metadata?.user_id;
        const customerEmail = session.customer_details?.email;

        const updateData = {
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_status: 'active',
          subscription_cancelled_at: null,
          subscription_trial_end: session.subscription
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        };

        if (userId) {
          // Preferred: match by user ID from metadata
          await supabase.from('users').update(updateData).eq('id', userId);
        } else if (customerEmail && customerId) {
          // Fallback: match by email, but only for users without an existing
          // stripe_customer_id to avoid overwriting other accounts' data
          await supabase
            .from('users')
            .update(updateData)
            .eq('username', customerEmail.toLowerCase().trim())
            .is('stripe_customer_id', null);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from('users')
          .update({
            subscription_status: subscription.status,
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await supabase
          .from('users')
          .update({
            subscription_status: 'cancelled',
            stripe_subscription_id: null,
            subscription_cancelled_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const sub = invoice.parent?.subscription_details?.subscription;
        const subscriptionId = typeof sub === 'string' ? sub : sub?.id;
        await supabase
          .from('users')
          .update({
            subscription_status: 'past_due',
          })
          .eq('stripe_subscription_id', subscriptionId);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
