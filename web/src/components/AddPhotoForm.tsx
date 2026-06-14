"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const ROOM_OPTIONS = [
  { value: "living_room", label: "Living room" },
  { value: "kitchen", label: "Kitchen" },
  { value: "bedroom", label: "Bedroom" },
  { value: "bathroom", label: "Bathroom" },
  { value: "exterior", label: "Exterior" },
  { value: "other", label: "Other" },
];

type AddPhotoFormProps = {
  jobId: string;
  photoCount: number;
  maxPhotos: number;
  planName: string;
  embedded?: boolean;
};

export function AddPhotoForm({ jobId, photoCount, maxPhotos, planName, embedded = false }: AddPhotoFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const atLimit = photoCount >= maxPhotos;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (atLimit) {
      setError(`${planName} allows up to ${maxPhotos} photos. Remove one or upgrade to Pro.`);
      return;
    }
    const form = e.currentTarget;
    const roomType = (new FormData(form).get("room_type") as string) || "";
    const files = fileInputRef.current?.files;

    if (!files?.length) {
      setError("Choose one or more photos");
      return;
    }
    if (!roomType) {
      setError("Choose a room type");
      return;
    }

    setLoading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const body = new FormData();
        body.set("file", files[i]!);
        body.set("room_type", roomType);
        body.set("sequence", String(i));

        const res = await fetch(`/api/jobs/${jobId}/photos`, {
          method: "POST",
          body,
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? `Upload failed (photo ${i + 1})`);
          setLoading(false);
          return;
        }
      }
      form.reset();
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  const form = (
    <>
      <h3 className="text-sm font-medium text-slate-900">Add photos</h3>
      {!embedded && (
        <p className="mt-1 text-sm text-slate-500">
          {photoCount} / {maxPhotos} on {planName}.
        </p>
      )}

      <div className={`grid gap-4 sm:grid-cols-2 ${embedded ? "mt-3" : "mt-5"}`}>
        <div>
          <label htmlFor="room_type" className="block text-sm font-medium text-slate-700">
            Room type
          </label>
          <select
            id="room_type"
            name="room_type"
            required
            className="mt-1.5 block w-full rounded-lg border border-wiselista-border bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
          >
            <option value="">Select room…</option>
            {ROOM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-medium text-slate-700">
            Upload
          </label>
          <div className="mt-1.5">
            <input
              ref={fileInputRef}
              id="file"
              name="file"
              type="file"
              accept="image/*"
              multiple
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:cursor-pointer hover:file:bg-slate-700"
            />
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading || atLimit} className="btn-primary mt-4 text-sm">
        {atLimit ? "Photo limit reached" : loading ? "Uploading…" : "Upload"}
      </button>
    </>
  );

  return (
    <form
      onSubmit={handleSubmit}
      className={embedded ? "" : "rounded-xl border border-slate-200 bg-white p-5"}
    >
      {form}
    </form>
  );
}
