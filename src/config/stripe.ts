import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

const stripeClient = stripeSecretKey
  ? new Stripe(stripeSecretKey)
  : null;

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    if (!stripeClient) {
      throw new Error("Stripe is not configured: set STRIPE_SECRET_KEY to use payment endpoints");
    }
    return Reflect.get(stripeClient, prop, receiver);
  },
});
