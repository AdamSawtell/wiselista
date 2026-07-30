"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/support";

type JobFailedPanelProps = {
  jobId: string;
  failureMessage?: string | null;
};

export function JobFailedPanel({ jobId, failureMessage }: JobFailedPanelProps) {
  const router = useRouter();
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRetry() {
    setRetrying(true);
    setError(null);
    try {
      // Fire process; do not wait for full Claid completion (Amplify may time out).
      // Job page ProcessingProgress will resume remaining photos.
      void fetch(`/api/jobs/${jobId}/process`, { method: "POST" });
      router.push(`/dashboard/jobs/${jobId}?submitted=1`);
      router.refresh();
    } catch {
      setError("Network error — try again");
      setRetrying(false);
    }
  }

  const mailto = supportMailto(
    "Wiselista job failed",
    `Job ID: ${jobId}\n\nPlease help with my failed photo enhancement.`
  );

  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm">
      <p className="font-medium text-red-900">Enhancement failed</p>
      {failureMessage && <p className="mt-1 text-red-800">{failureMessage}</p>}
      <p className="mt-2 text-red-800">
        Job ID: <code className="rounded bg-red-100 px-1.5 py-0.5 text-xs">{jobId}</code>
      </p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void handleRetry()}
          disabled={retrying}
          className="rounded-md bg-red-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {retrying ? "Retrying…" : "Try again"}
        </button>
        <a
          href={mailto}
          className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-900 hover:bg-red-100"
        >
          Email {SUPPORT_EMAIL}
        </a>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
