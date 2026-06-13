import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { DeleteJobButton } from "@/components/DeleteJobButton";
import { getJobDisplayName, formatJobDate } from "@/lib/jobs";

export type JobCardPhoto = {
  url: string | null;
  roomType: string;
};

type JobCardProps = {
  job: {
    id: string;
    status: string;
    name: string | null;
    created_at: string;
    photoCount: number;
  };
  previews: JobCardPhoto[];
};

function previewLabel(count: number, max: number): string {
  if (count <= max) return "";
  return `+${count - max}`;
}

export function JobCard({ job, previews }: JobCardProps) {
  const slots = [0, 1, 2, 3];
  const filled = previews.filter((p) => p.url);
  const extra = previewLabel(job.photoCount, 4);

  return (
    <li className="group overflow-hidden rounded-xl border border-wiselista-border bg-white shadow-sm transition-all hover:border-slate-300 hover:shadow-md">
      <Link href={`/dashboard/jobs/${job.id}`} className="block">
        <div className="grid grid-cols-4 gap-0.5 bg-slate-100 p-0.5">
          {slots.map((i) => {
            const photo = filled[i];
            return (
              <div
                key={i}
                className="relative aspect-[4/3] overflow-hidden bg-slate-200"
              >
                {photo?.url ? (
                  <img
                    src={photo.url}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : i === 3 && extra ? (
                  <div className="flex h-full items-center justify-center bg-slate-800/80 text-sm font-semibold text-white">
                    {extra}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-slate-300">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h2 className="min-w-0 flex-1 truncate font-semibold text-slate-900">
              {getJobDisplayName(job)}
            </h2>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            {job.photoCount === 0
              ? "No photos yet"
              : `${job.photoCount} photo${job.photoCount === 1 ? "" : "s"}`}
            {" · "}
            {formatJobDate(job.created_at)}
          </p>
        </div>
      </Link>

      <div className="flex items-center justify-between border-t border-wiselista-border px-4 py-2.5">
        <Link
          href={`/dashboard/jobs/${job.id}`}
          className="text-sm font-medium text-wiselista-accent hover:underline"
        >
          Open project
        </Link>
        <DeleteJobButton jobId={job.id} variant="link" />
      </div>
    </li>
  );
}
