"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type DeletePhotoButtonProps = {
  jobId: string;
  photoId: string;
  label?: string;
};

export function DeletePhotoButton({ jobId, photoId, label = "Delete photo" }: DeletePhotoButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Remove this photo from the job?")) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/photos/${photoId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not delete photo");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-50"
      >
        {loading ? "Deleting…" : label}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
