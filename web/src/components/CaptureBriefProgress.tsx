"use client";

import {
  computeBriefProgress,
  orderedSlots,
  resolveCaptureBrief,
  type CaptureBrief,
} from "@/lib/capture-brief";

type Props = {
  captureBrief: unknown;
  filledSlotIds: Iterable<string | null | undefined>;
  showOptional?: boolean;
};

export function CaptureBriefProgress({ captureBrief, filledSlotIds, showOptional = true }: Props) {
  const brief = resolveCaptureBrief(captureBrief);
  const progress = computeBriefProgress(brief, filledSlotIds);
  const slots = orderedSlots(brief);
  const pct =
    progress.requiredTotal > 0
      ? Math.round((progress.requiredFilled / progress.requiredTotal) * 100)
      : 0;

  return (
    <section className="rounded-xl border border-wiselista-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Shot list</h2>
          <p className="mt-1 text-sm text-slate-500">
            {progress.requiredFilled} of {progress.requiredTotal} required photos captured
            {showOptional && progress.optionalTotal > 0 && (
              <span>
                {" "}
                · {progress.optionalFilled}/{progress.optionalTotal} optional
              </span>
            )}
          </p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            progress.requiredFilled >= progress.requiredTotal
              ? "bg-emerald-100 text-emerald-800"
              : "bg-sky-100 text-sky-800"
          }`}
        >
          {pct}%
        </span>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-wiselista-accent transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {slots.map((slot) => {
          const done = progress.filledSlotIds.has(slot.id);
          return (
            <li
              key={slot.id}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : slot.required
                    ? "border-slate-200 bg-white text-slate-700"
                    : "border-dashed border-slate-200 bg-slate-50 text-slate-500"
              }`}
            >
              <span className="text-base leading-none">{done ? "✓" : slot.required ? "○" : "·"}</span>
              <span className="flex-1">{slot.label}</span>
              {!slot.required && !done && (
                <span className="text-[10px] uppercase tracking-wide text-slate-400">Optional</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function briefFromJson(raw: unknown): CaptureBrief {
  return resolveCaptureBrief(raw);
}
