import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { query } from '@/backend/db/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2023-10-16',
});

export async function POST(request: Request) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  try {
    if (webhookSecret && webhookSecret !== 'whsec_placeholder' && sig) {
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // Dev mode: parse the event as-is
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle payment success
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;

    if (userId) {
      try {
        await query(
          `UPDATE users SET plan = 'pro', updated_at = NOW() WHERE id = $1`,
          [parseInt(userId)]
        );
        console.log(`✅ User ${userId} upgraded to Pro via Stripe`);
      } catch (dbError: any) {
        console.error('Failed to upgrade user plan:', dbError.message);
      }
    }
  }

  return NextResponse.json({ received: true });
}
