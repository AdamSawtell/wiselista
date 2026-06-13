"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeleteJobButtonProps = {
  jobId: string;
  /** If set, navigate here after delete (e.g. from job detail page). Otherwise refresh dashboard. */
  redirectAfter?: string;
  variant?: "link" | "button";
};

export function DeleteJobButton({
  jobId,
  redirectAfter,
  variant = "button",
}: DeleteJobButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this project and all its photos? This cannot be undone.")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
      let data: { error?: string; ok?: boolean } = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }
      if (!res.ok) {
        setError(data.error ?? "Could not delete project");
        setLoading(false);
        return;
      }
      if (redirectAfter) {
        router.push(redirectAfter);
        router.refresh();
      } else {
        router.refresh();
        setLoading(false);
      }
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  const className =
    variant === "link"
      ? "text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
      : "rounded border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50";

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={handleDelete} disabled={loading} className={className}>
        {loading ? "Deleting…" : "Delete project"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
