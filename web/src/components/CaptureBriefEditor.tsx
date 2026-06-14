"use client";

import { useMemo, useState } from "react";
import {
  BRIEF_TEMPLATES,
  buildCaptureBrief,
  briefFromTemplate,
  requiredSlotCount,
  totalSlotCount,
  validateBriefForPlan,
  type BriefTemplateId,
  type CaptureBrief,
} from "@/lib/capture-brief";
import { type PlanTier } from "@/lib/plans";

type Props = {
  planTier: PlanTier;
  value: CaptureBrief;
  onChange: (brief: CaptureBrief) => void;
  compact?: boolean;
};

export function CaptureBriefEditor({ planTier, value, onChange, compact = false }: Props) {
  const [templateId, setTemplateId] = useState<string>(value.template_id || "house_3");

  const validation = useMemo(() => validateBriefForPlan(value, planTier), [value, planTier]);
  const required = requiredSlotCount(value);
  const total = totalSlotCount(value);

  function applyTemplate(id: BriefTemplateId | string) {
    setTemplateId(id);
    onChange(briefFromTemplate(id));
  }

  function updateCounts(partial: {
    bedrooms?: number;
    bathrooms?: number;
    include_study?: boolean;
    include_dining?: boolean;
    include_laundry?: boolean;
    include_garage?: boolean;
  }) {
    onChange(
      buildCaptureBrief({
        template_id: "custom",
        bedrooms: partial.bedrooms ?? value.bedrooms,
        bathrooms: partial.bathrooms ?? value.bathrooms,
        include_study: partial.include_study ?? value.include_study,
        include_dining: partial.include_dining ?? value.include_dining,
        include_laundry: partial.include_laundry ?? value.include_laundry,
        include_garage: partial.include_garage ?? value.include_garage,
      })
    );
    setTemplateId("custom");
  }

  return (
    <div className={compact ? "space-y-4" : "space-y-5"}>
      <div>
        <p className="text-sm font-medium text-slate-700">Property type</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Pick a template — we build the shot list your customer (or you) will follow room by room.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {BRIEF_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t.id)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                templateId === t.id
                  ? "border-wiselista-accent bg-sky-50 ring-1 ring-wiselista-accent"
                  : "border-wiselista-border bg-white hover:border-slate-300"
              }`}
            >
              <span className="block font-medium text-slate-900">{t.name}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{t.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CounterField
          label="Bedrooms"
          value={value.bedrooms}
          min={0}
          max={8}
          onChange={(n) => updateCounts({ bedrooms: n })}
        />
        <CounterField
          label="Bathrooms"
          value={value.bathrooms}
          min={1}
          max={5}
          onChange={(n) => updateCounts({ bathrooms: n })}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700">Optional rooms</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <ToggleChip
            label="Study"
            checked={value.include_study}
            onChange={(v) => updateCounts({ include_study: v })}
          />
          <ToggleChip
            label="Dining"
            checked={value.include_dining}
            onChange={(v) => updateCounts({ include_dining: v })}
          />
          <ToggleChip
            label="Laundry"
            checked={value.include_laundry}
            onChange={(v) => updateCounts({ include_laundry: v })}
          />
          <ToggleChip
            label="Garage"
            checked={value.include_garage}
            onChange={(v) => updateCounts({ include_garage: v })}
          />
        </div>
      </div>

      <div className="rounded-lg border border-wiselista-border bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-900">Shot list preview</p>
          <p className="text-xs text-slate-600">
            {required} required · {total} total
          </p>
        </div>
        <ol className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
          {value.slots.map((slot, i) => (
            <li key={slot.id} className="flex items-center gap-2 text-slate-700">
              <span className="w-5 shrink-0 text-xs text-slate-400">{i + 1}.</span>
              <span className="flex-1">{slot.label}</span>
              {!slot.required && (
                <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-600">
                  Optional
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>

      {!validation.ok && <p className="text-sm text-amber-800">{validation.error}</p>}
    </div>
  );
}

function CounterField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-wiselista-border bg-white text-lg text-slate-600 hover:bg-slate-50"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-sm font-semibold text-slate-900">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-wiselista-border bg-white text-lg text-slate-600 hover:bg-slate-50"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        checked
          ? "border-wiselista-accent bg-sky-100 text-sky-900"
          : "border-wiselista-border bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      {checked ? "✓ " : ""}
      {label}
    </button>
  );
}

export function captureBriefIsValid(brief: CaptureBrief, planTier: PlanTier): boolean {
  return validateBriefForPlan(brief, planTier).ok;
}
