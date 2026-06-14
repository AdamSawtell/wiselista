"use client";

import { useState } from "react";
import { CaptureBriefEditor, captureBriefIsValid } from "@/components/CaptureBriefEditor";
import {
  defaultCaptureBrief,
  orderedSlots,
  requiredSlotCount,
  resolveCaptureBrief,
  type CaptureBrief,
} from "@/lib/capture-brief";
import { type PlanTier } from "@/lib/plans";

type Props = {
  jobId: string;
  planTier: PlanTier;
  initialBrief: unknown;
  editable: boolean;
};

function briefSummary(brief: CaptureBrief): string {
  const slots = orderedSlots(brief);
  const required = requiredSlotCount(brief);
  const labels = slots
    .filter((s) => s.required)
    .slice(0, 4)
    .map((s) => s.label);
  const extra = required - labels.length;
  const list = labels.join(", ");
  return extra > 0 ? `${list}, +${extra} more` : list;
}

export function JobCaptureBriefPanel({ jobId, planTier, initialBrief, editable }: Props) {
  const [brief, setBrief] = useState<CaptureBrief>(() => resolveCaptureBrief(initialBrief));
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!editable) {
    return null;
  }

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

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-900">Shot list</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {requiredSlotCount(brief)} required rooms — {briefSummary(brief)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-medium text-wiselista-accent hover:underline"
        >
          {expanded ? "Hide editor" : "Customize"}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 rounded-lg border border-slate-200 p-4">
          <CaptureBriefEditor planTier={planTier} value={brief} onChange={setBrief} compact />
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void saveBrief()}
              disabled={saving || !captureBriefIsValid(brief, planTier)}
              className="btn-primary text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save shot list"}
            </button>
            <button
              type="button"
              onClick={() => setBrief(defaultCaptureBrief())}
              className="btn-secondary text-sm"
            >
              Reset
            </button>
            {saved && <span className="self-center text-xs text-emerald-600">Saved</span>}
          </div>
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
