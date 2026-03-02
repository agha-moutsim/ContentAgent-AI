import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import Stripe from 'stripe';
import { requireAuth } from '@/backend/middleware/auth';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

export async function POST(request: Request) {
  return await requireAuth(request as any, async (req) => {
    try {
      const priceId = process.env.STRIPE_PRICE_ID_PRO;
      if (!priceId || priceId === 'price_placeholder') {
        return NextResponse.json(
          { error: 'Stripe is not configured yet.' },
          { status: 500 }
        );
      }

      let appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      if (!appUrl.startsWith('http')) {
        appUrl = `https://${appUrl}`;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard?upgraded=true`,
        cancel_url: `${appUrl}/pricing`,
        metadata: {
          userId: String(req.user!.userId),
        },
        customer_email: req.user!.email || undefined,
      });

      return NextResponse.json({ url: session.url });
    } catch (error: any) {
      console.error('Stripe checkout error:', error.message);
      return NextResponse.json(
        { error: error.message || 'Failed to create checkout session.' },
        { status: 500 }
      );
    }
  });
}
