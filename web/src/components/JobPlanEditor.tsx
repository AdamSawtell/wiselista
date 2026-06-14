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
  embedded?: boolean;
};

export function JobPlanEditor({
  jobId,
  initialTier,
  photoCount,
  editable,
  expiresAt,
  embedded = false,
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

  const inner = (
    <>
      <h3 className="text-sm font-medium text-slate-900">Plan</h3>
      {!embedded && (
        <p className="mt-1 text-sm text-slate-500">
          {editable
            ? "Choose Core or Pro before you submit."
            : `${planTierLabel(tier)} · ${formatPlanPrice(tier)}`}
        </p>
      )}

      {editable ? (
        <div className="mt-3">
          <PlanSelector value={tier} onChange={handleChange} disabled={saving} compact />
        </div>
      ) : (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          <li>
            {photoCount} / {plan.maxPhotos} photos · {plan.retentionDays} day retention
          </li>
          {expiresAt && <li>Available until {new Date(expiresAt).toLocaleDateString()}</li>}
        </ul>
      )}

      {saving && <p className="mt-2 text-xs text-slate-500">Updating…</p>}
      {saved && !saving && <p className="mt-2 text-xs text-emerald-600">Plan updated.</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </>
  );

  if (embedded) return <div>{inner}</div>;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">{inner}</section>
  );
}
