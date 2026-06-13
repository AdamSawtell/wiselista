"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SubmitJobButtonProps = {
  jobId: string;
  photoCount: number;
};

export function SubmitJobButton({ jobId, photoCount }: SubmitJobButtonProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit() {
    if (photoCount < 1) {
      setError("Add at least one photo first");
      return;
    }
    setLoading(true);
    setError(null);
    setProgress(5);

    const estimateMs = photoCount * 20000;
    const tick = setInterval(() => {
      setProgress((p) => Math.min(p + 2, 90));
    }, estimateMs / 40);

    try {
      const res = await fetch(`/api/jobs/${jobId}/submit`, { method: "POST" });
      const data = await res.json();
      clearInterval(tick);
      if (!res.ok) {
        setError(data.error ?? "Submit failed");
        setLoading(false);
        setProgress(0);
        return;
      }
      setProgress(100);
      if (data.skippedPayment) {
        router.push(`/dashboard/jobs/${jobId}?submitted=1`);
        router.refresh();
        return;
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("No payment URL returned. Add Stripe keys to .env.local to test payment.");
      setLoading(false);
      setProgress(0);
    } catch {
      clearInterval(tick);
      setError("Something went wrong");
      setLoading(false);
      setProgress(0);
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
        {loading ? "Enhancing photos…" : "Submit for edit"}
      </button>
      {loading && (
        <div className="mt-4 max-w-md">
          <p className="text-sm text-amber-800">
            Enhancing {photoCount} photo{photoCount === 1 ? "" : "s"} — about 20 seconds each.
          </p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-amber-200">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {photoCount < 1 && (
        <p className="mt-2 text-sm text-slate-500">Add at least one photo to submit.</p>
      )}
    </div>
  );
}
