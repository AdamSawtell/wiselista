import { supabase } from "./supabase";
import type { JobStatus } from "../types";

const BUCKET = "wiselista-photos";

/** First photo per job, preferring edited when the job is ready. */
export async function fetchJobThumbnailUrls(
  jobs: { id: string; status: JobStatus }[]
): Promise<Record<string, string>> {
  if (jobs.length === 0) return {};

  const jobIds = jobs.map((j) => j.id);
  const { data: photos } = await supabase
    .from("photos")
    .select("job_id, original_key, edited_key, sequence")
    .in("job_id", jobIds)
    .order("sequence");

  const statusByJob = Object.fromEntries(jobs.map((j) => [j.id, j.status]));
  const firstByJob: Record<string, { original_key: string; edited_key: string | null }> = {};
  for (const photo of photos ?? []) {
    if (!firstByJob[photo.job_id]) {
      firstByJob[photo.job_id] = photo;
    }
  }

  const urls: Record<string, string> = {};
  await Promise.all(
    Object.entries(firstByJob).map(async ([jobId, photo]) => {
      const useEdited = statusByJob[jobId] === "ready" && photo.edited_key;
      const key = useEdited ? photo.edited_key! : photo.original_key;
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(key, 3600);
      if (data?.signedUrl) urls[jobId] = data.signedUrl;
    })
  );
  return urls;
}
