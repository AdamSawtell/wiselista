"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ReprocessPhotoButtonProps = {
  jobId: string;
  photoId: string;
};

export function ReprocessPhotoButton({ jobId, photoId }: ReprocessPhotoButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleReprocess() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}/reprocess`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Re-enhance failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void handleReprocess()}
        disabled={loading}
        className="text-xs font-medium text-wiselista-accent hover:underline disabled:opacity-50"
      >
        {loading ? "Enhancing…" : "Enhance again"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
