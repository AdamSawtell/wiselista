"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CAPTURE_STATUS_LABELS,
  normalizeCaptureStatus,
  type CaptureStatus,
} from "@/lib/capture-shared";

import { isDefaultProjectName } from "@/lib/jobs";

type CaptureEvent = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type CaptureState = {
  capture_enabled: boolean;
  capture_status: string;
  capture_viewed_at: string | null;
  capture_started_at: string | null;
  capture_submitted_at: string | null;
  capture_customer_name: string | null;
  capture_expires_at: string | null;
  url: string | null;
  photoCount: number;
  events: CaptureEvent[];
};

type Props = {
  jobId: string;
  planTier: string;
  isDraft: boolean;
  initialEnabled?: boolean;
  jobName?: string | null;
  propertyAddress?: string | null;
  embedded?: boolean;
};

export function CustomerCapturePanel({
  jobId,
  planTier,
  isDraft,
  initialEnabled,
  jobName,
  propertyAddress,
  embedded = false,
}: Props) {
  const [state, setState] = useState<CaptureState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();
  const prevPhotoCount = useRef<number | null>(null);
  const prevStatus = useRef<CaptureStatus | null>(null);

  const isPro = planTier === "pro";

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/capture`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load capture status");
        return;
      }

      const count = typeof data.photoCount === "number" ? data.photoCount : 0;
      const status = normalizeCaptureStatus(data.capture_status);
      const countIncreased =
        prevPhotoCount.current !== null && count > prevPhotoCount.current;
      const justSubmitted =
        prevStatus.current !== null &&
        prevStatus.current !== "submitted" &&
        status === "submitted";

      if (countIncreased || justSubmitted) {
        router.refresh();
        if (justSubmitted) {
          setTimeout(() => {
            document.getElementById("job-photos")?.scrollIntoView({ behavior: "smooth" });
          }, 400);
        }
      }

      prevPhotoCount.current = count;
      prevStatus.current = status;
      setState(data);
    } catch {
      setError("Could not load capture status");
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    void refresh();
    if (!isDraft) return;
    const interval = setInterval(() => void refresh(), 8000);
    return () => clearInterval(interval);
  }, [refresh, isDraft]);

  async function enableCapture() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/capture`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not create capture link");
        return;
      }
      await refresh();
    } catch {
      setError("Could not create capture link");
    } finally {
      setBusy(false);
    }
  }

  async function revokeCapture() {
    if (!confirm("Revoke this capture link? The customer will no longer be able to upload.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/jobs/${jobId}/capture`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Could not revoke link");
        return;
      }
      await refresh();
    } catch {
      setError("Could not revoke link");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!state?.url) return;
    await navigator.clipboard.writeText(state.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!isPro) {
    if (embedded) {
      return (
        <div>
          <h3 className="text-sm font-medium text-slate-900">Customer capture</h3>
          <p className="mt-1 text-xs text-slate-500">
            Send a phone link for your vendor or tenant to photograph the property. Included on Pro.
          </p>
        </div>
      );
    }
    return (
      <section className="rounded-lg border border-dashed border-slate-200 p-4">
        <h2 className="text-sm font-medium text-slate-900">Customer capture</h2>
        <p className="mt-1 text-xs text-slate-500">
          Send a phone link for your vendor or tenant to photograph the property. Included on Pro.
        </p>
      </section>
    );
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading customer capture…</p>;
  }

  const status = normalizeCaptureStatus(state?.capture_status);
  const enabled = state?.capture_enabled || initialEnabled;
  const hasProjectName = !isDefaultProjectName(jobName, jobId);
  const hasAddress = Boolean(propertyAddress?.trim());
  const setupReady = hasProjectName;

  const Wrapper = embedded ? "div" : "section";
  const wrapperClass = embedded ? "" : "rounded-xl border border-slate-200 bg-white p-5";

  return (
    <Wrapper className={wrapperClass}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-900">Customer capture</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Magic link for room-by-room photos on their phone — no login.
          </p>
        </div>
        {enabled && (
          <span className="text-xs font-medium text-slate-600">{CAPTURE_STATUS_LABELS[status]}</span>
        )}
      </div>

      {isDraft && !enabled && !embedded && (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          <li className={hasProjectName ? "text-emerald-800" : ""}>
            {hasProjectName ? "✓" : "○"} Project name set
          </li>
          <li className={hasAddress ? "text-emerald-800" : "text-slate-500"}>
            {hasAddress ? "✓" : "○"} Address recommended
          </li>
        </ul>
      )}

      {!enabled && isDraft && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void enableCapture()}
            disabled={busy || !setupReady}
            className="btn-secondary text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Creating link…" : "Create capture link"}
          </button>
          {!setupReady && (
            <p className="mt-2 text-xs text-amber-800">Add a project name first — your customer will see it.</p>
          )}
        </div>
      )}

      {enabled && state?.url && (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
            <p className="break-all text-xs text-slate-700">{state.url}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyLink()} className="btn-secondary text-xs">
                {copied ? "Copied" : "Copy link"}
              </button>
              {isDraft && (
                <>
                  <button type="button" onClick={() => void enableCapture()} disabled={busy} className="text-xs text-slate-600 hover:underline">
                    Refresh
                  </button>
                  <button type="button" onClick={() => void revokeCapture()} disabled={busy} className="text-xs text-red-600 hover:underline">
                    Revoke
                  </button>
                </>
              )}
            </div>
            {state.capture_expires_at && (
              <p className="mt-2 text-xs text-slate-400">
                Expires {new Date(state.capture_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {!embedded && <CaptureTimeline status={status} state={state} />}

          {embedded && status !== "idle" && status !== "link_sent" && (
            <p className="text-xs text-slate-600">
              {CAPTURE_STATUS_LABELS[status]}
              {state.photoCount > 0 && ` · ${state.photoCount} photo${state.photoCount === 1 ? "" : "s"}`}
            </p>
          )}

          {status === "submitted" && (
            <p className="text-xs text-emerald-800">
              {state.capture_customer_name ? `${state.capture_customer_name} sent ` : "Customer sent "}
              {state.photoCount} photo{state.photoCount === 1 ? "" : "s"} — review above, then submit.
            </p>
          )}

          {!embedded && state.events.length > 0 && (
            <details className="text-xs text-slate-500">
              <summary className="cursor-pointer font-medium text-slate-600">Activity</summary>
              <ul className="mt-2 space-y-1">
                {state.events.slice(0, 6).map((event) => (
                  <li key={event.id}>
                    {formatEventTime(event.created_at)} · {formatEventLabel(event)}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Wrapper>
  );
}

function CaptureTimeline({ status, state }: { status: CaptureStatus; state: CaptureState }) {
  const steps: { key: CaptureStatus; label: string; at: string | null }[] = [
    { key: "link_sent", label: "Link sent", at: null },
    { key: "viewed", label: "Customer opened link", at: state.capture_viewed_at },
    { key: "in_progress", label: "Taking photos", at: state.capture_started_at },
    { key: "submitted", label: "Photos sent to you", at: state.capture_submitted_at },
  ];

  const rank = (s: CaptureStatus) =>
    ["idle", "link_sent", "viewed", "in_progress", "submitted"].indexOf(s);

  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {steps.map((step) => {
        const done = rank(status) >= rank(step.key);
        return (
          <li
            key={step.key}
            className={`rounded-lg border px-3 py-2 text-sm ${
              done ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <p className="font-medium">{step.label}</p>
            {step.at && <p className="mt-0.5 text-xs opacity-80">{formatEventTime(step.at)}</p>}
            {step.key === "in_progress" && done && (
              <p className="mt-0.5 text-xs opacity-80">{state.photoCount} photo(s) so far</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function formatEventTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEventLabel(event: CaptureEvent): string {
  switch (event.event_type) {
    case "link_created":
      return "Capture link created";
    case "viewed":
      return "Customer opened the link";
    case "photo_uploaded":
      return `Photo uploaded (${String(event.metadata?.room_type ?? "room").replace(/_/g, " ")})`;
    case "submitted":
      return "Customer sent photos to agent";
    case "link_revoked":
      return "Capture link revoked";
    default:
      return event.event_type.replace(/_/g, " ");
  }
}
