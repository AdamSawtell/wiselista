"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type PlanTier } from "@/lib/plans";
import { PlanSelector } from "@/components/PlanSelector";
import { CaptureBriefEditor, captureBriefIsValid } from "@/components/CaptureBriefEditor";
import { defaultCaptureBrief, type CaptureBrief } from "@/lib/capture-brief";

type CreateJobFormProps = {
  /** Inline name + create for the app header. */
  compact?: boolean;
};

export function CreateJobForm({ compact = false }: CreateJobFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [planTier, setPlanTier] = useState<PlanTier>("core");
  const [customerCapture, setCustomerCapture] = useState(false);
  const [captureBrief, setCaptureBrief] = useState<CaptureBrief>(() => defaultCaptureBrief());
  const [customizeShotList, setCustomizeShotList] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name.trim()) {
      setError("Add a listing name — street or property is enough.");
      return;
    }
    if (!captureBriefIsValid(captureBrief, planTier)) {
      setError("Adjust the shot list to fit your plan limits.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          plan_tier: planTier,
          customer_capture: planTier === "pro" && customerCapture,
          capture_brief: captureBrief,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        setLoading(false);
        return;
      }
      setName("");
      setPlanTier("core");
      setExpanded(false);
      router.push(`/dashboard/jobs/${data.id}`);
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  if (compact) {
    if (!expanded) {
      return (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="btn-primary px-4 py-2 text-sm"
        >
          New project
        </button>
      );
    }

    return (
      <form
        onSubmit={handleCreate}
        className="flex items-center gap-2"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setExpanded(false);
            setError(null);
          }
        }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="12 Oak Street"
          required
          maxLength={120}
          autoFocus
          className="w-36 rounded-lg border border-wiselista-border px-3 py-1.5 text-sm focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent sm:w-44"
        />
        <button type="submit" disabled={loading} className="btn-primary px-3 py-1.5 text-sm">
          {loading ? "…" : "Create"}
        </button>
        {error && <span className="text-xs text-red-600">{error}</span>}
      </form>
    );
  }

  return (
    <form onSubmit={handleCreate} className="space-y-6">
      <div>
        <label htmlFor="project-name" className="block text-sm font-medium text-slate-800">
          Listing name
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="12 Oak Street"
          required
          maxLength={120}
          className="mt-2 block w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
        />
        <p className="mt-1.5 text-xs text-slate-500">Street or property name. You can rename it later.</p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-800">Plan</p>
        <div className="mt-2">
          <PlanSelector
            compact
            value={planTier}
            onChange={(tier) => {
              setPlanTier(tier);
              if (tier !== "pro") setCustomerCapture(false);
            }}
          />
        </div>
      </div>

      {planTier === "pro" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-4 py-3">
          <input
            type="checkbox"
            checked={customerCapture}
            onChange={(e) => setCustomerCapture(e.target.checked)}
            className="mt-0.5 text-wiselista-accent focus:ring-wiselista-accent"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Customer captures photos</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
              Send a link to your vendor or tenant — no account needed.
            </span>
          </span>
        </label>
      )}

      <div className="rounded-lg border border-slate-200">
        <button
          type="button"
          onClick={() => setCustomizeShotList((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
        >
          <span>
            <span className="font-medium text-slate-900">Shot list</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Default: 3 bed house ({captureBrief.slots.filter((s) => s.required).length} required rooms)
            </span>
          </span>
          <span className="text-slate-400">{customizeShotList ? "−" : "+"}</span>
        </button>
        {customizeShotList && (
          <div className="border-t border-slate-200 px-4 pb-4 pt-2">
            <CaptureBriefEditor
              planTier={planTier}
              value={captureBrief}
              onChange={setCaptureBrief}
              compact
            />
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading || !captureBriefIsValid(captureBrief, planTier)}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create project"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
