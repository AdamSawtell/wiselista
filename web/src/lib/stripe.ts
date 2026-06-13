import Stripe from "stripe";
import { getPlanConfig, type PlanTier } from "@/lib/plans";

/** @deprecated Use getPlanConfig(tier).priceCents */
export const JOB_PRICE_CENTS = 2900;

let stripeClient: Stripe | null = null;

/** True when Stripe Checkout should run. Set WISELISTA_SKIP_PAYMENT=true to force test bypass. */
export function isStripePaymentEnabled(): boolean {
  if (process.env.WISELISTA_SKIP_PAYMENT === "true") return false;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("...")) return false;
  return true;
}

export function getStripe(): Stripe | null {
  if (!isStripePaymentEnabled()) return null;
  const key = process.env.STRIPE_SECRET_KEY!;
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: "2025-02-24.acacia" });
  }
  return stripeClient;
}

export function jobPriceCents(planTier: string | null | undefined): number {
  return getPlanConfig(planTier).priceCents;
}

export function stripeProductName(planTier: PlanTier | string | null | undefined): string {
  return `${getPlanConfig(planTier).name} — photo edit (this project)`;
}
