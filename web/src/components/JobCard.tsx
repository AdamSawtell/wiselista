import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { getJobDisplayName, formatJobDateShort } from "@/lib/jobs";

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

function statusHint(status: string): string | null {
  switch (status) {
    case "draft":
      return "Add photos and submit when ready";
    case "processing":
    case "submitted":
    case "payment_pending":
      return "Enhancement in progress";
    case "ready":
      return "Download and share";
    case "failed":
      return "Needs attention";
    default:
      return null;
  }
}

export function JobCard({ job, previews }: JobCardProps) {
  const hero = previews.find((p) => p.url)?.url ?? null;
  const hint = statusHint(job.status);

  return (
    <li>
      <Link
        href={`/dashboard/jobs/${job.id}`}
        className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-slate-50 sm:gap-5 sm:px-5"
      >
        <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100 sm:h-[4.5rem] sm:w-24">
          {hero ? (
            <img src={hero} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-slate-300">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.25}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h2 className="truncate text-base font-medium text-slate-900 group-hover:text-wiselista-accent">
              {getJobDisplayName(job)}
            </h2>
            <StatusBadge status={job.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {job.photoCount === 0
              ? "No photos"
              : `${job.photoCount} photo${job.photoCount === 1 ? "" : "s"}`}
            <span className="mx-1.5 text-slate-300">·</span>
            {formatJobDateShort(job.created_at)}
          </p>
          {hint && <p className="mt-0.5 hidden text-xs text-slate-400 sm:block">{hint}</p>}
        </div>

        <span
          className="shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500"
          aria-hidden
        >
          →
        </span>
      </Link>
    </li>
  );
}
