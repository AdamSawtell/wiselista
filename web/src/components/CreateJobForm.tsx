"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreateJobFormProps = {
  /** Compact button for the app header; full form for the dashboard hero. */
  compact?: boolean;
};

export function CreateJobForm({ compact = false }: CreateJobFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [expanded, setExpanded] = useState(false);
  const router = useRouter();

  async function handleCreate(e?: React.FormEvent) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create project");
        setLoading(false);
        return;
      }
      setName("");
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
    <form onSubmit={handleCreate} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-end">
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
      <button type="submit" disabled={loading} className="btn-primary shrink-0">
        {loading ? "Creating…" : "Create project"}
      </button>
      {error && <p className="w-full text-sm text-red-600 sm:order-last">{error}</p>}
    </form>
  );
}
