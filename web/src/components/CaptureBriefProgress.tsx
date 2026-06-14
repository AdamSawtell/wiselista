"use client";

import {
  computeBriefProgress,
  resolveCaptureBrief,
} from "@/lib/capture-brief";

type Props = {
  captureBrief: unknown;
  filledSlotIds: Iterable<string | null | undefined>;
  compact?: boolean;
};

export function CaptureBriefProgress({ captureBrief, filledSlotIds, compact = false }: Props) {
  const brief = resolveCaptureBrief(captureBrief);
  const progress = computeBriefProgress(brief, filledSlotIds);
  const pct =
    progress.requiredTotal > 0
      ? Math.round((progress.requiredFilled / progress.requiredTotal) * 100)
      : 0;

  if (compact) {
    if (progress.requiredTotal === 0) return null;
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span>
            Shot list · {progress.requiredFilled}/{progress.requiredTotal} required
          </span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-wiselista-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-700">
          {progress.requiredFilled} of {progress.requiredTotal} required rooms photographed
        </span>
        <span className="text-xs tabular-nums text-slate-500">{pct}%</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-wiselista-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
