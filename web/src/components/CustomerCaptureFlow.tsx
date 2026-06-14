"use client";

import { useEffect, useRef, useState } from "react";
import {
  CAPTURE_WELCOME_TIPS,
  getCaptureTipsForSlot,
  type CaptureSession,
} from "@/lib/capture-shared";
import {
  estimateBrightnessFromFile,
  getBrightnessHint,
  getBrightnessStatus,
} from "@/lib/capture-coaching";
import { computeBriefProgress, isBriefComplete, progressForSlots } from "@/lib/capture-brief";

type Props = {
  token: string;
  initialSession: CaptureSession;
};

export function CustomerCaptureFlow({ token, initialSession }: Props) {
  const [session, setSession] = useState(initialSession);
  const [started, setStarted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoHint, setPhotoHint] = useState<string | null>(null);
  const [done, setDone] = useState(initialSession.alreadySubmitted);
  const [customerName, setCustomerName] = useState("");
  const [filledSlots, setFilledSlots] = useState<Set<string>>(
    () => new Set(initialSession.filledSlotIds)
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const slots = session.slots;
  const slot = slots[stepIndex];
  const tips = slot ? getCaptureTipsForSlot(slot) : [];
  const progress = progressForSlots(slots, filledSlots);
  const briefComplete = isBriefComplete(progress);

  useEffect(() => {
    void fetch(`/api/capture/${token}/complete`, { method: "PATCH" });
  }, [token]);

  async function refreshSession() {
    const res = await fetch(`/api/capture/${token}`);
    if (res.ok) {
      const data = (await res.json()) as CaptureSession;
      setSession(data);
      setFilledSlots(new Set(data.filledSlotIds));
      if (data.alreadySubmitted) setDone(true);
    }
  }

  async function uploadPhoto(file: File) {
    if (!slot) return;
    setUploading(true);
    setError(null);
    setPhotoHint(null);

    const luma = await estimateBrightnessFromFile(file);
    if (luma !== null) {
      const hint = getBrightnessHint(getBrightnessStatus(luma));
      if (hint) setPhotoHint(hint);
    }

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("room_type", slot.room_type);
      body.append("brief_slot_id", slot.id);
      const res = await fetch(`/api/capture/${token}/photos`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      setFilledSlots((prev) => new Set(prev).add(slot.id));
      setSession((s) => ({ ...s, photoCount: data.photoCount ?? s.photoCount + 1, filledSlotIds: [...filledSlots, slot.id] }));
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
          {progress.requiredFilled} / {progress.requiredTotal} required rooms · {session.photoCount} photos
        </p>
      </header>

      {!started ? (
        <section className="rounded-2xl border border-wiselista-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Before you start</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your agent set up {slots.length} rooms for this property. We&apos;ll guide you through each one with
            tips for listing-quality photos on your phone.
          </p>
          <ol className="mt-5 space-y-3">
            {CAPTURE_WELCOME_TIPS.map((tip, i) => (
              <li key={tip} className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ol>
          <ul className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            {slots.slice(0, 6).map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-0.5">
                <span className="text-slate-400">·</span>
                {s.label}
                {!s.required && <span className="text-xs text-slate-400">(optional)</span>}
              </li>
            ))}
            {slots.length > 6 && (
              <li className="pt-1 text-xs text-slate-500">+ {slots.length - 6} more rooms</li>
            )}
          </ul>
          <button type="button" onClick={() => setStarted(true)} className="btn-primary mt-6 w-full">
            Start photographing
          </button>
        </section>
      ) : stepIndex < slots.length ? (
        <section className="rounded-2xl border border-wiselista-border bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-wiselista-accent">
            Room {stepIndex + 1} of {slots.length}
            {!slot?.required && " · Optional"}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{slot?.label}</h2>

          <div className="mt-4 rounded-lg bg-sky-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-800">Tips for this room</p>
            <ul className="mt-3 space-y-2">
              {tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-0.5 text-wiselista-accent">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          {slot?.room_type === "exterior" && (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Tip: rotate your phone sideways (landscape) for front-of-house shots.
            </p>
          )}

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
              {uploading ? "Uploading…" : filledSlots.has(slot!.id) ? "Retake photo" : "Take photo"}
            </button>
            {filledSlots.has(slot!.id) && !photoHint && (
              <p className="mt-2 text-center text-xs text-emerald-600">Photo saved for this room</p>
            )}
            {photoHint && (
              <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs text-amber-900">
                {photoHint}
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setPhotoHint(null);
                setStepIndex((i) => i + 1);
              }}
              className="btn-secondary flex-1 text-sm"
            >
              {filledSlots.has(slot!.id) ? "Next room" : slot?.required ? "Skip for now" : "Skip room"}
            </button>
            {stepIndex === slots.length - 1 && session.photoCount > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex(slots.length)}
                className="btn-primary flex-1 text-sm"
              >
                Finish
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border border-wiselista-border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Send to your agent</h2>
          <p className="mt-2 text-sm text-slate-600">
            You&apos;ve added {session.photoCount} photo{session.photoCount === 1 ? "" : "s"}
            {briefComplete
              ? " — all required rooms are done."
              : ` — ${progress.requiredTotal - progress.requiredFilled} required room(s) still missing.`}
          </p>

          {!briefComplete && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              You can still send now, but your agent may ask for missing rooms.
            </p>
          )}

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
            onClick={() => {
              setStarted(true);
              setStepIndex(0);
            }}
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
