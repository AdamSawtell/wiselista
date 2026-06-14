"use client";

import { useCallback, useEffect, useState } from "react";
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
};

export function CustomerCapturePanel({
  jobId,
  planTier,
  isDraft,
  initialEnabled,
  jobName,
  propertyAddress,
}: Props) {
  const [state, setState] = useState<CaptureState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isPro = planTier === "pro";

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/capture`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not load capture status");
        return;
      }
      setState(data);
    } catch {
      setError("Could not load capture status");
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    void refresh();
    if (!isDraft) return;
    const interval = setInterval(() => void refresh(), 15000);
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
    return (
      <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
        <h2 className="font-semibold text-slate-900">Send to customer to capture</h2>
        <p className="mt-1 text-sm text-slate-600">
          Let your vendor or tenant photograph the property on their phone — no account needed. Available on
          Wiselista Pro.
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

  return (
    <section className="rounded-xl border border-wiselista-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Send to customer to capture</h2>
          <p className="mt-1 text-sm text-slate-500">
            Your customer opens a link on their phone, follows room-by-room steps with tips, and sends photos
            straight to this project. No login required.
          </p>
        </div>
        {enabled && (
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-800">
            {CAPTURE_STATUS_LABELS[status]}
          </span>
        )}
      </div>

      {isDraft && !enabled && (
        <ul className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
          <li className={hasProjectName ? "text-emerald-800" : "text-slate-600"}>
            {hasProjectName ? "✓" : "○"} Project name — so your customer knows which property (rename at the top)
          </li>
          <li className={hasAddress ? "text-emerald-800" : "text-slate-500"}>
            {hasAddress ? "✓" : "○"} Property address — recommended, shown on the customer&apos;s phone
          </li>
          <li className="text-slate-600">
            ○ Shot list — configure rooms above so your customer knows what to photograph
          </li>
        </ul>
      )}

      {!enabled && isDraft && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => void enableCapture()}
            disabled={busy || !setupReady}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Creating link…" : "Create capture link"}
          </button>
          {!setupReady && (
            <p className="mt-2 text-sm text-amber-800">
              Add a project name before sending the link — your customer will see it on their phone.
            </p>
          )}
        </div>
      )}

      {enabled && state?.url && (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-wiselista-border bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Capture link</p>
            <p className="mt-1 break-all text-sm text-slate-800">{state.url}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => void copyLink()} className="btn-secondary text-sm">
                {copied ? "Copied!" : "Copy link"}
              </button>
              {isDraft && (
                <>
                  <button type="button" onClick={() => void enableCapture()} disabled={busy} className="btn-secondary text-sm">
                    Refresh link
                  </button>
                  <button type="button" onClick={() => void revokeCapture()} disabled={busy} className="text-sm text-red-600 hover:underline">
                    Revoke link
                  </button>
                </>
              )}
            </div>
            {state.capture_expires_at && (
              <p className="mt-2 text-xs text-slate-500">
                Link expires {new Date(state.capture_expires_at).toLocaleDateString()}
              </p>
            )}
          </div>

          <CaptureTimeline status={status} state={state} />

          {status === "submitted" && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <p className="font-medium text-emerald-900">Customer sent photos</p>
              <p className="mt-1 text-sm text-emerald-800">
                {state.capture_customer_name ? `${state.capture_customer_name} submitted ` : "Submitted "}
                {state.photoCount} photo{state.photoCount === 1 ? "" : "s"}. Review below, then submit for AI
                enhancement.
              </p>
            </div>
          )}

          {state.events.length > 0 && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Activity</p>
              <ul className="mt-2 space-y-2">
                {state.events.slice(0, 6).map((event) => (
                  <li key={event.id} className="text-sm text-slate-600">
                    <span className="text-slate-400">{formatEventTime(event.created_at)}</span>
                    {" · "}
                    {formatEventLabel(event)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </section>
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
