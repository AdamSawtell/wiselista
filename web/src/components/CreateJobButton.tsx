"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateJobButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jobs", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create job");
        setLoading(false);
        return;
      }
      router.refresh();
      router.push(`/dashboard/jobs/${data.id}`);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCreate}
        disabled={loading}
        className="btn-primary"
      >
        {loading ? "Creating…" : "Create new job"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
