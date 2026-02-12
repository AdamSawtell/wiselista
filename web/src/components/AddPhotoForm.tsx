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
};

export function AddPhotoForm({ jobId }: AddPhotoFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
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

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4">
      <h3 className="font-medium text-slate-900">Add photos</h3>
      <div>
        <label htmlFor="room_type" className="block text-sm font-medium text-slate-700">
          Room type (for selected photos)
        </label>
        <select
          id="room_type"
          name="room_type"
          required
          className="mt-1 block w-full rounded-lg border border-wiselista-border bg-white px-3 py-2 text-sm text-slate-900 focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
        >
          <option value="">Select…</option>
          {ROOM_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="file" className="block text-sm font-medium text-slate-700">
          Photo(s)
        </label>
        <p className="mt-0.5 text-xs text-slate-500">
          Take a photo or choose from your library. You can select multiple.
        </p>
        <input
          ref={fileInputRef}
          id="file"
          name="file"
          type="file"
          accept="image/*"
          multiple
          className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-wiselista-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:cursor-pointer hover:file:bg-wiselista-accent-hover"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "Uploading…" : "Add selected photos"}
      </button>
    </form>
  );
}
