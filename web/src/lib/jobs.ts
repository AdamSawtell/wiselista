export const ROOM_LABELS: Record<string, string> = {
  living_room: "Living room",
  kitchen: "Kitchen",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  exterior: "Exterior",
  other: "Other",
};

const UNTITLED_LISTING = "Untitled listing";

export function getJobDisplayName(job: { name?: string | null; id: string }): string {
  const trimmed = job.name?.trim();
  if (trimmed && trimmed !== `Project ${job.id.slice(0, 8)}`) return trimmed;
  return UNTITLED_LISTING;
}

/** True when the agent has not renamed the auto-generated project title. */
export function isDefaultProjectName(name: string | null | undefined, jobId: string): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  if (trimmed === UNTITLED_LISTING) return true;
  return trimmed === `Project ${jobId.slice(0, 8)}`;
}

export function formatJobDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function formatJobDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export type JobStatusFilterValue = "all" | "draft" | "processing" | "ready" | "failed";

export function matchesStatusFilter(status: string, filter: JobStatusFilterValue): boolean {
  if (filter === "all") return true;
  if (filter === "processing") {
    return status === "submitted" || status === "payment_pending" || status === "processing";
  }
  return status === filter;
}

export function countJobsByStatus(jobs: { status: string }[]): Record<JobStatusFilterValue, number> {
  return {
    all: jobs.length,
    draft: jobs.filter((j) => j.status === "draft").length,
    processing: jobs.filter((j) =>
      matchesStatusFilter(j.status, "processing")
    ).length,
    ready: jobs.filter((j) => j.status === "ready").length,
    failed: jobs.filter((j) => j.status === "failed").length,
  };
}
