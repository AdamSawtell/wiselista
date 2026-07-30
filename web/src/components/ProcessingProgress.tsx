"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProcessingProgressProps = {
  jobId: string;
  photoCount: number;
  initialStatus: string;
};

export function ProcessingProgress({ jobId, photoCount, initialStatus }: ProcessingProgressProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(photoCount);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "processing") return;

    let active = true;
    let inFlight = false;
    let lastKickOffAt = 0;

    const kickOffProcessing = async (force = false) => {
      if (!active || inFlight) return;
      const now = Date.now();
      // One photo per /process call — allow the next kick shortly after the last one returns.
      if (!force && lastKickOffAt > 0 && now - lastKickOffAt < 4_000) return;
      inFlight = true;
      lastKickOffAt = now;
      try {
        await fetch(`/api/jobs/${jobId}/process`, { method: "POST" });
      } catch {
        // allow another retry on the next poll window
        lastKickOffAt = 0;
      } finally {
        inFlight = false;
      }
    };

    void kickOffProcessing(true);

    const poll = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}/processing`);
        if (!res.ok || !active) return;
        const data = await res.json();
        setStatus(data.status);
        setCurrent(data.current ?? 0);
        setTotal(data.total || photoCount);
        if (data.startedAt) setStartedAt(data.startedAt);
        if (data.status === "ready" || data.status === "failed") {
          router.refresh();
          return;
        }
        // Still processing → kick again so Amplify ~30s timeouts can resume remaining photos.
        if (data.status === "processing") {
          void kickOffProcessing();
        }
      } catch {
        // keep polling
      }
    };

    void poll();
    const id = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [jobId, photoCount, status, router]);

  if (status !== "processing") return null;

  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const label =
    current > 0
      ? `Enhancing photo ${current} of ${total}…`
      : `Starting enhancement (${total} photo${total === 1 ? "" : "s"})…`;

  return (
    <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-amber-900">Enhancing your photos</h2>
          <p className="mt-1 text-sm text-amber-800">{label}</p>
          {startedAt && (
            <p className="mt-1 text-xs text-amber-700">Usually about 20 seconds per photo.</p>
          )}
        </div>
        <span className="text-lg font-bold text-amber-900">{pct}%</span>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-amber-200">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${Math.max(pct, 5)}%` }}
        />
      </div>
    </section>
  );
}
