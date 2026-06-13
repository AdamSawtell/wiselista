"use client";

import { useState } from "react";

type ShareLinkButtonProps = {
  jobId: string;
};

export function ShareLinkButton({ jobId }: ShareLinkButtonProps) {
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create share link");
        return;
      }
      setUrl(data.url);
      await navigator.clipboard.writeText(data.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={() => void handleShare()} disabled={loading} className="btn-secondary text-sm">
        {loading ? "Creating link…" : "Share with client"}
      </button>
      {copied && <p className="mt-2 text-xs text-emerald-600">Link copied to clipboard</p>}
      {url && (
        <p className="mt-2 max-w-md truncate text-xs text-slate-500" title={url}>
          {url}
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
