"use client";

import { useState } from "react";

type DownloadZipButtonProps = {
  jobId: string;
  photoCount: number;
};

export function DownloadZipButton({ jobId, photoCount }: DownloadZipButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}/download-zip`);
      if (!res.ok) return;
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "wiselista-photos.zip";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  if (photoCount === 0) return null;

  return (
    <button type="button" onClick={() => void handleDownload()} disabled={loading} className="btn-primary text-sm">
      {loading ? "Building ZIP…" : `Download ZIP (${photoCount})`}
    </button>
  );
}
