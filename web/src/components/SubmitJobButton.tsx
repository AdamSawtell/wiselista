"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SubmitJobButtonProps = {
  jobId: string;
  photoCount: number;
};

export function SubmitJobButton({ jobId, photoCount }: SubmitJobButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit() {
    if (photoCount < 1) {
      setError("Add at least one photo first");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/submit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submit failed");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No payment URL returned. Add Stripe keys to .env.local to test payment.");
      setLoading(false);
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading || photoCount < 1}
        className="btn-primary"
      >
        {loading ? "Redirecting to payment…" : "Submit for edit"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
      {photoCount < 1 && (
        <p className="mt-2 text-sm text-slate-500">Add at least one photo to submit.</p>
      )}
    </div>
  );
}
