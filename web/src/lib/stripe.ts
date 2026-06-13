import Stripe from "stripe";

/** NZD $29 per job — fixed per-job pricing for V1 pilot. */
export const JOB_PRICE_CENTS = 2900;

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}
