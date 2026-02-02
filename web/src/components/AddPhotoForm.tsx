"use client";

import { useState } from "react";
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
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const file = formData.get("file") as File | null;
    const roomType = formData.get("room_type") as string;

    if (!file?.size) {
      setError("Choose a photo");
      return;
    }
    if (!roomType) {
      setError("Choose a room type");
      return;
    }

    setLoading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("room_type", roomType);
      body.set("sequence", "0");

      const res = await fetch(`/api/jobs/${jobId}/photos`, {
        method: "POST",
        body,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setLoading(false);
        return;
      }
      form.reset();
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 space-y-4">
      <h3 className="font-medium text-slate-900">Add photo</h3>
      <div>
        <label htmlFor="room_type" className="block text-sm font-medium text-slate-700">
          Room type
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
          Photo
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="mt-1 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-wiselista-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white file:cursor-pointer hover:file:bg-wiselista-accent-hover"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="btn-primary"
      >
        {loading ? "Uploading…" : "Add photo"}
      </button>
    </form>
  );
}
