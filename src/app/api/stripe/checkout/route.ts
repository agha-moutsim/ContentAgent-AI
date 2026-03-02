import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { stripeService } from '@/backend/services/stripe';
import { requireAuth } from '@/backend/middleware/auth';

/**
 * POST /api/stripe/checkout
 * Creates a Stripe Checkout session for the authenticated user
 */
export async function POST(request: Request) {
  return await requireAuth(request as any, async (req) => {
    try {
      const { priceId } = await req.json();

      if (!priceId) {
        return NextResponse.json(
          { error: 'Price ID is required' },
          { status: 400 }
        );
      }

      const session = await stripeService.createCheckoutSession(
        req.user!.userId,
        req.user!.email,
        priceId
      );

      return NextResponse.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout error:', error);
      return NextResponse.json(
        { error: 'Failed to create checkout session' },
        { status: 500 }
      );
    }
  });
}
