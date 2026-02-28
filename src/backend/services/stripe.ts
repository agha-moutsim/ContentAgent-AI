import Stripe from 'stripe';
import { config } from '../config';

const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16' as any, // Stripe versions can be finicky in TS
});

/**
 * Service for managing Stripe payments and subscriptions
 */
export const stripeService = {
  /**
   * Creates a checkout session for a subscription
   */
  async createCheckoutSession(userId: string, email: string, priceId: string) {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${config.app.url}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.app.url}/dashboard/settings`,
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        userId: userId,
      },
    });

    return session;
  },

  /**
   * Creates a customer portal session for managing subscriptions
   */
  async createPortalSession(stripeCustomerId: string) {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${config.app.url}/dashboard/settings`,
    });

    return session;
  },

  /**
   * Verifies a stripe webhook signature
   */
  verifyWebhook(body: string, sig: string) {
    return stripe.webhooks.constructEvent(
      body,
      sig,
      config.stripe.webhookSecret
    );
  }
};
