import { useEffect, useState } from "react";
import { APP_URL } from "../lib/supabase";
import type { JobStatus } from "../types";

type ProcessingState = {
  status: JobStatus;
  current: number;
  total: number;
  failureMessage: string | null;
};

const POLL_MS = 2500;
const ACTIVE_STATUSES: JobStatus[] = ["submitted", "processing", "payment_pending"];

export function useJobProcessing(
  jobId: string,
  accessToken: string | undefined,
  initialStatus: JobStatus,
  photoCount: number
): ProcessingState {
  const [state, setState] = useState<ProcessingState>({
    status: initialStatus,
    current: 0,
    total: photoCount,
    failureMessage: null,
  });

  useEffect(() => {
    setState((prev) => ({
      ...prev,
      status: initialStatus,
      total: photoCount || prev.total,
    }));
  }, [initialStatus, photoCount]);

  useEffect(() => {
    if (!accessToken || !ACTIVE_STATUSES.includes(initialStatus)) return;

    let active = true;
    let inFlight = false;
    let lastKickOffAt = 0;
    const base = (APP_URL || "https://wiselista.com").replace(/\/$/, "");

    const kickOffProcessing = async (force = false) => {
      if (!active || inFlight || initialStatus !== "processing") return;
      const now = Date.now();
      if (!force && lastKickOffAt > 0 && now - lastKickOffAt < 3_000) return;
      inFlight = true;
      lastKickOffAt = now;
      try {
        await fetch(`${base}/api/jobs/${jobId}/process`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      } catch {
        lastKickOffAt = 0;
      } finally {
        inFlight = false;
      }
    };

    void kickOffProcessing(true);

    const poll = async () => {
      try {
        const res = await fetch(`${base}/api/jobs/${jobId}/processing`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok || !active) return;
        const data = (await res.json()) as {
          status?: JobStatus;
          current?: number;
          total?: number;
          ready?: number;
          failureMessage?: string | null;
        };
        setState({
          status: data.status ?? initialStatus,
          current: data.ready ?? data.current ?? 0,
          total: data.total || photoCount,
          failureMessage: data.failureMessage ?? null,
        });
        if (data.status === "processing") {
          void kickOffProcessing();
        }
      } catch {
        // keep polling — server cron continues if app backgrounds
      }
    };

    void poll();
    const id = setInterval(poll, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [jobId, accessToken, initialStatus, photoCount]);

  return state;
}
