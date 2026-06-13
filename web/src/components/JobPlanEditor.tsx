"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  canDowngradeToCore,
  formatPlanPrice,
  getPlanConfig,
  planTierLabel,
  type PlanTier,
} from "@/lib/plans";
import { PlanSelector } from "@/components/PlanSelector";

type JobPlanEditorProps = {
  jobId: string;
  initialTier: PlanTier;
  photoCount: number;
  editable: boolean;
  expiresAt?: string | null;
};

export function JobPlanEditor({
  jobId,
  initialTier,
  photoCount,
  editable,
  expiresAt,
}: JobPlanEditorProps) {
  const [tier, setTier] = useState<PlanTier>(initialTier);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const plan = getPlanConfig(tier);

  async function saveTier(nextTier: PlanTier) {
    if (!editable || nextTier === tier) return;

    if (nextTier === "core" && !canDowngradeToCore(photoCount)) {
      setError(
        `Remove photos until you have ${getPlanConfig("core").maxPhotos} or fewer before switching to Core.`
      );
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_tier: nextTier }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not update plan");
        return;
      }
      setTier(nextTier);
      setSaved(true);
      router.refresh();
    } catch {
      setError("Could not update plan");
    } finally {
      setSaving(false);
    }
  }

  function handleChange(nextTier: PlanTier) {
    setTier(nextTier);
    setSaved(false);
    void saveTier(nextTier);
  }

  return (
    <section className="rounded-xl border border-wiselista-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Plan</h2>
          <p className="mt-1 text-sm text-slate-500">
            {editable
              ? "Choose Core or Pro — you can upgrade at any time before you submit."
              : `${planTierLabel(tier)} · ${formatPlanPrice(tier)}`}
          </p>
        </div>
        {!editable && (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {plan.name.replace("Wiselista ", "")}
          </span>
        )}
      </div>

      {editable ? (
        <div className="mt-4">
          <PlanSelector value={tier} onChange={handleChange} disabled={saving} compact />
        </div>
      ) : (
        <ul className="mt-4 space-y-1 text-sm text-slate-600">
          <li>
            Photos: {photoCount} / {plan.maxPhotos}
          </li>
          <li>Project available for {plan.retentionDays} days after enhancement</li>
          <li>{plan.shareEnabled ? "Share with client included" : "Share with client — Pro only"}</li>
          {expiresAt && (
            <li className="text-slate-500">Available until {new Date(expiresAt).toLocaleDateString()}</li>
          )}
        </ul>
      )}

      {saving && <p className="mt-3 text-sm text-slate-500">Updating plan…</p>}
      {saved && !saving && (
        <p className="mt-3 text-sm text-emerald-600">Plan updated to {planTierLabel(tier)}.</p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
