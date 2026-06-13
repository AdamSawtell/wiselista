"use client";

import { useEffect, useRef, useState } from "react";
import {
  CAPTURE_TIPS,
  GUIDED_CAPTURE_SEQUENCE,
  roomLabel,
  type CaptureSession,
} from "@/lib/capture-shared";

type Props = {
  token: string;
  initialSession: CaptureSession;
};

export function CustomerCaptureFlow({ token, initialSession }: Props) {
  const [session, setSession] = useState(initialSession);
  const [stepIndex, setStepIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(initialSession.alreadySubmitted);
  const [customerName, setCustomerName] = useState("");
  const [uploadedRooms, setUploadedRooms] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const room = GUIDED_CAPTURE_SEQUENCE[stepIndex];
  const tips = room ? CAPTURE_TIPS[room] ?? [] : [];

  useEffect(() => {
    void fetch(`/api/capture/${token}/complete`, { method: "PATCH" });
  }, [token]);

  async function refreshSession() {
    const res = await fetch(`/api/capture/${token}`);
    if (res.ok) {
      const data = (await res.json()) as CaptureSession;
      setSession(data);
      if (data.alreadySubmitted) setDone(true);
    }
  }

  async function uploadPhoto(file: File) {
    if (!room) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("room_type", room);
      const res = await fetch(`/api/capture/${token}/photos`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setUploadedRooms((prev) => new Set(prev).add(room));
      setSession((s) => ({ ...s, photoCount: data.photoCount ?? s.photoCount + 1 }));
    } catch {
      setError("Upload failed — check your connection");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleComplete() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/capture/${token}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: customerName.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send photos");
        return;
      }
      setDone(true);
      await refreshSession();
    } catch {
      setError("Could not send photos");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">
          ✓
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-900">Photos sent to {session.agentName}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Thank you — your agent will enhance these photos and follow up with you. You can close this page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <header className="mb-6 rounded-2xl border border-wiselista-border bg-wiselista-navy p-6 text-white">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-200">Photo capture</p>
        <h1 className="mt-2 text-2xl font-bold">{session.propertyName}</h1>
        {session.propertyAddress && <p className="mt-1 text-slate-200">{session.propertyAddress}</p>}
        <p className="mt-3 text-sm text-slate-300">
          {session.agentName}
          {session.agentAgency ? ` · ${session.agentAgency}` : ""} asked you to photograph this property.
        </p>
        <p className="mt-2 text-xs text-sky-200">
          {session.photoCount} / {session.maxPhotos} photos · No account needed
        </p>
      </header>

      {stepIndex < GUIDED_CAPTURE_SEQUENCE.length ? (
        <section className="rounded-2xl border border-wiselista-border bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-wiselista-accent">
            Room {stepIndex + 1} of {GUIDED_CAPTURE_SEQUENCE.length}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{roomLabel(room)}</h2>

          <ul className="mt-4 space-y-2">
            {tips.map((tip) => (
              <li key={tip} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-0.5 text-wiselista-accent">•</span>
                {tip}
              </li>
            ))}
          </ul>

          <div className="mt-6">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadPhoto(file);
              }}
            />
            <button
              type="button"
              disabled={uploading || session.photoCount >= session.maxPhotos}
              onClick={() => fileRef.current?.click()}
              className="btn-primary w-full"
            >
              {uploading ? "Uploading…" : uploadedRooms.has(room) ? "Retake photo" : "Take photo"}
            </button>
            {uploadedRooms.has(room) && (
              <p className="mt-2 text-center text-xs text-emerald-600">Photo saved for this room</p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => setStepIndex((i) => i + 1)}
              className="btn-secondary flex-1 text-sm"
            >
              {uploadedRooms.has(room) ? "Next room" : "Skip room"}
            </button>
            {stepIndex === GUIDED_CAPTURE_SEQUENCE.length - 1 && session.photoCount > 0 && (
              <button type="button" onClick={() => setStepIndex(GUIDED_CAPTURE_SEQUENCE.length)} className="btn-primary flex-1 text-sm">
                Finish
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-wiselista-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Send to your agent</h2>
          <p className="mt-2 text-sm text-slate-600">
            You&apos;ve added {session.photoCount} photo{session.photoCount === 1 ? "" : "s"}. Send them to{" "}
            {session.agentName} for professional enhancement.
          </p>

          <label className="mt-4 block">
            <span className="text-sm font-medium text-slate-700">Your name (optional)</span>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. Sarah Chen"
              className="mt-1.5 w-full rounded-lg border border-wiselista-border px-3 py-2.5 text-sm"
            />
          </label>

          <button
            type="button"
            disabled={submitting || session.photoCount < 1}
            onClick={() => void handleComplete()}
            className="btn-primary mt-5 w-full"
          >
            {submitting ? "Sending…" : "Send photos to agent"}
          </button>

          <button
            type="button"
            onClick={() => setStepIndex(0)}
            className="mt-3 w-full text-sm text-slate-500 hover:text-wiselista-accent"
          >
            Add more photos
          </button>
        </section>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </div>
  );
}
