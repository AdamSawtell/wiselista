export const PLAN_TIERS = ["core", "pro"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export type PlanConfig = {
  id: PlanTier;
  name: string;
  priceAud: number;
  priceCents: number;
  maxPhotos: number;
  retentionDays: number;
  shareEnabled: boolean;
};

export const PLANS: Record<PlanTier, PlanConfig> = {
  core: {
    id: "core",
    name: "Wiselista Core",
    priceAud: 29,
    priceCents: 2900,
    maxPhotos: 15,
    retentionDays: 60,
    shareEnabled: false,
  },
  pro: {
    id: "pro",
    name: "Wiselista Pro",
    priceAud: 49,
    priceCents: 4900,
    maxPhotos: 25,
    retentionDays: 90,
    shareEnabled: true,
  },
};

export function normalizePlanTier(tier: string | null | undefined): PlanTier {
  return tier === "pro" ? "pro" : "core";
}

export function getPlanConfig(tier: string | null | undefined): PlanConfig {
  return PLANS[normalizePlanTier(tier)];
}

export function computeExpiresAt(from: Date, tier: string | null | undefined): string {
  const plan = getPlanConfig(tier);
  const expires = new Date(from);
  expires.setDate(expires.getDate() + plan.retentionDays);
  return expires.toISOString();
}

export function planTierLabel(tier: string | null | undefined): string {
  return getPlanConfig(tier).name;
}

export function formatPlanPrice(tier: string | null | undefined): string {
  return `$${getPlanConfig(tier).priceAud} AUD`;
}

export function canDowngradeToCore(photoCount: number): boolean {
  return photoCount <= PLANS.core.maxPhotos;
}
