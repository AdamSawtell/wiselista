export const ROOM_LABELS: Record<string, string> = {
  living_room: "Living room",
  kitchen: "Kitchen",
  bedroom: "Bedroom",
  bathroom: "Bathroom",
  exterior: "Exterior",
  other: "Other",
};

export function getJobDisplayName(job: { name?: string | null; id: string }): string {
  const trimmed = job.name?.trim();
  if (trimmed) return trimmed;
  return `Project ${job.id.slice(0, 8)}`;
}

/** True when the agent has not renamed the auto-generated project title. */
export function isDefaultProjectName(name: string | null | undefined, jobId: string): boolean {
  const trimmed = name?.trim();
  if (!trimmed) return true;
  return trimmed === `Project ${jobId.slice(0, 8)}`;
}

export function formatJobDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
