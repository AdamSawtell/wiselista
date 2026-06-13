export const PLAN_TIERS = ["core", "pro"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const PLANS = {
  core: {
    id: "core" as const,
    name: "Wiselista Core",
    priceAud: 29,
    maxPhotos: 15,
    retentionDays: 60,
    shareEnabled: false,
    captureEnabled: false,
  },
  pro: {
    id: "pro" as const,
    name: "Wiselista Pro",
    priceAud: 49,
    maxPhotos: 25,
    retentionDays: 90,
    shareEnabled: true,
    captureEnabled: true,
  },
} as const;

export function normalizePlanTier(tier: string | null | undefined): PlanTier {
  return tier === "pro" ? "pro" : "core";
}

export function getPlanConfig(tier: string | null | undefined) {
  return PLANS[normalizePlanTier(tier)];
}
