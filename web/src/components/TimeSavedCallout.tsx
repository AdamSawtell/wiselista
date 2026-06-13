import { formatDurationMs } from "@/lib/enhancement";

type TimeSavedCalloutProps = {
  photoCount: number;
  processingStartedAt: string | null;
  completedAt: string | null;
};

export function TimeSavedCallout({
  photoCount,
  processingStartedAt,
  completedAt,
}: TimeSavedCalloutProps) {
  if (!photoCount) return null;

  let durationText = "a couple of minutes";
  if (processingStartedAt && completedAt) {
    const ms = new Date(completedAt).getTime() - new Date(processingStartedAt).getTime();
    if (ms > 0) durationText = formatDurationMs(ms);
  }

  return (
    <section className="rounded-xl border border-violet-200 bg-violet-50/70 p-5">
      <p className="text-sm font-medium text-violet-900">
        {photoCount} photo{photoCount === 1 ? "" : "s"} enhanced in {durationText}
      </p>
      <p className="mt-1 text-sm text-violet-800">
        Typical photographer turnaround is 2–3 days. You&apos;re listing-ready now.
      </p>
    </section>
  );
}
