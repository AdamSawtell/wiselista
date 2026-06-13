"use client";

import { PLANS, type PlanTier } from "@/lib/plans";

type PlanSelectorProps = {
  value: PlanTier;
  onChange: (tier: PlanTier) => void;
  disabled?: boolean;
  compact?: boolean;
};

const CORE_FEATURES = [
  "All AI enhancement features",
  "Up to 15 photos per project",
  "Project available for 60 days",
  "Web and mobile capture",
];

const PRO_FEATURES = [
  "Everything in Core",
  "Up to 25 photos per project",
  "Project available for 90 days",
  "Share with client link",
];

export function PlanSelector({ value, onChange, disabled, compact }: PlanSelectorProps) {
  if (compact) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        {(["core", "pro"] as const).map((tier) => (
          <label
            key={tier}
            className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-colors ${
              value === tier
                ? "border-wiselista-accent bg-sky-50 text-slate-900"
                : "border-wiselista-border bg-white text-slate-700 hover:border-slate-300"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="plan_tier"
              value={tier}
              checked={value === tier}
              disabled={disabled}
              onChange={() => onChange(tier)}
              className="text-wiselista-accent focus:ring-wiselista-accent"
            />
            <span>
              <span className="font-medium">{PLANS[tier].name}</span>
              <span className="ml-2 text-slate-500">${PLANS[tier].priceAud} AUD</span>
            </span>
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {(["core", "pro"] as const).map((tier) => {
        const plan = PLANS[tier];
        const selected = value === tier;
        const features = tier === "core" ? CORE_FEATURES : PRO_FEATURES;

        return (
          <label
            key={tier}
            className={`cursor-pointer rounded-xl border p-5 transition-colors ${
              selected
                ? "border-wiselista-accent bg-sky-50/50 ring-1 ring-wiselista-accent/30"
                : "border-wiselista-border bg-white hover:border-slate-300"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="plan_tier"
              value={tier}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(tier)}
              className="sr-only"
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{plan.name}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  ${plan.priceAud}
                  <span className="text-sm font-medium text-slate-500"> AUD</span>
                </p>
              </div>
              {tier === "pro" && (
                <span className="rounded-full bg-wiselista-accent px-2.5 py-0.5 text-xs font-semibold text-white">
                  Pro
                </span>
              )}
            </div>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <span className="mt-0.5 text-wiselista-accent">✓</span>
                  {feature}
                </li>
              ))}
            </ul>
          </label>
        );
      })}
    </div>
  );
}
