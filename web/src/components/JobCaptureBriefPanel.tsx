"use client";

import { useState } from "react";
import { CaptureBriefEditor, captureBriefIsValid } from "@/components/CaptureBriefEditor";
import { defaultCaptureBrief, resolveCaptureBrief, type CaptureBrief } from "@/lib/capture-brief";
import { type PlanTier } from "@/lib/plans";

type Props = {
  jobId: string;
  planTier: PlanTier;
  initialBrief: unknown;
  editable: boolean;
};

export function JobCaptureBriefPanel({ jobId, planTier, initialBrief, editable }: Props) {
  const [brief, setBrief] = useState<CaptureBrief>(() => resolveCaptureBrief(initialBrief));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveBrief() {
    if (!captureBriefIsValid(brief, planTier)) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ capture_brief: brief }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save shot list");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Could not save shot list");
    } finally {
      setSaving(false);
    }
  }

  function resetBrief() {
    setBrief(defaultCaptureBrief());
  }

  return (
    <section className="rounded-xl border border-wiselista-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Capture brief</h2>
          <p className="mt-1 text-sm text-slate-500">
            Set up the rooms for this property — your customer link and guided shoot follow this shot list.
          </p>
        </div>
        {saved && <span className="text-sm font-medium text-emerald-700">Saved</span>}
      </div>

      <div className="mt-5">
        <CaptureBriefEditor
          planTier={planTier}
          value={brief}
          onChange={setBrief}
          compact
        />
      </div>

      {editable && (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void saveBrief()}
            disabled={saving || !captureBriefIsValid(brief, planTier)}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save shot list"}
          </button>
          <button type="button" onClick={resetBrief} className="btn-secondary text-sm">
            Reset to default
          </button>
        </div>
      )}

      {!editable && (
        <p className="mt-4 text-sm text-slate-500">
          Shot list is locked after you submit for enhancement.
        </p>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
  );
}
