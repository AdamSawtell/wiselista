import { getEnhancementSummary } from "@/lib/enhancement";
import { ROOM_LABELS } from "@/lib/jobs";

type PhotoSummary = { id: string; room_type: string };

type EnhancementSummaryProps = {
  photos: PhotoSummary[];
};

export function EnhancementSummary({ photos }: EnhancementSummaryProps) {
  if (!photos.length) return null;

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5">
      <h2 className="font-semibold text-emerald-900">What we improved</h2>
      <p className="mt-1 text-sm text-emerald-800">
        Realistic enhancement only — no objects added or removed. Each photo uses a room-specific preset.
      </p>
      <ul className="mt-4 space-y-2">
        {photos.map((photo) => (
          <li key={photo.id} className="rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-700">
            <span className="font-medium text-slate-900">
              {ROOM_LABELS[photo.room_type] ?? photo.room_type}:
            </span>{" "}
            {getEnhancementSummary(photo.room_type)}
          </li>
        ))}
      </ul>
    </section>
  );
}
