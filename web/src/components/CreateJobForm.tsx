"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { type PlanTier } from "@/lib/plans";
import { PlanSelector } from "@/components/PlanSelector";

type CreateJobFormProps = {
  /** Compact button for the app header; full form for the dashboard hero. */
  compact?: boolean;
};

export function CreateJobForm({ compact = false }: CreateJobFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [planTier, setPlanTier] = useState<PlanTier>("core");
  const [customerCapture, setCustomerCapture] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    if (planTier === "pro" && customerCapture && !name.trim()) {
      setError("Add a project name when sending the link to your customer to capture photos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          plan_tier: planTier,
          customer_capture: planTier === "pro" && customerCapture,
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
          placeholder="Project name"
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
    <form onSubmit={handleCreate} className="card flex flex-col gap-5 p-5">
      <div className="min-w-0 flex-1">
        <label htmlFor="project-name" className="block text-sm font-medium text-slate-700">
          Project name
        </label>
        <input
          id="project-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 12 Oak Street listing"
          maxLength={120}
          className="mt-1.5 block w-full rounded-lg border border-wiselista-border px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
        />
        <p className="mt-1 text-xs text-slate-500">Optional — you can rename later.</p>
      </div>

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">Choose a plan</p>
        <PlanSelector value={planTier} onChange={(tier) => {
          setPlanTier(tier);
          if (tier !== "pro") setCustomerCapture(false);
        }} />
        <p className="mt-2 text-xs text-slate-500">You can upgrade to Pro at any time before you submit.</p>
      </div>

      {planTier === "pro" && (
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-wiselista-border bg-sky-50/50 p-4">
          <input
            type="checkbox"
            checked={customerCapture}
            onChange={(e) => setCustomerCapture(e.target.checked)}
            className="mt-1 text-wiselista-accent focus:ring-wiselista-accent"
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Customer will capture photos</span>
            <span className="mt-0.5 block text-xs text-slate-600">
              Send a link to your vendor or tenant — they photograph the property on their phone (no account
              needed) and photos appear in this project.
            </span>
          </span>
        </label>
      )}

      <button type="submit" disabled={loading} className="btn-primary shrink-0 self-start">
        {loading ? "Creating…" : "Create project"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
