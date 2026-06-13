import { supabase } from "./supabase";
import { getPlanConfig, normalizePlanTier } from "./plans";
import type { RoomType } from "../types";

export type UploadPhotoResult = {
  photoId: string;
  storageKey: string;
  sequence: number;
};

/** Upload a captured image to storage and insert the photo row. */
export async function uploadJobPhoto(
  userId: string,
  jobId: string,
  imageUri: string,
  roomType: RoomType
): Promise<UploadPhotoResult> {
  const { data: job } = await supabase
    .from("jobs")
    .select("plan_tier, status")
    .eq("id", jobId)
    .single();

  if (!job || job.status !== "draft") {
    throw new Error("Project not found or not editable");
  }

  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  const plan = getPlanConfig(normalizePlanTier(job.plan_tier));
  if ((count ?? 0) >= plan.maxPhotos) {
    throw new Error(`${plan.name} allows up to ${plan.maxPhotos} photos`);
  }

  const response = await fetch(imageUri);
  const blob = await response.blob();
  const storageKey = `${userId}/${jobId}/${crypto.randomUUID()}.jpg`;

  const { error: uploadError } = await supabase.storage
    .from("wiselista-photos")
    .upload(storageKey, blob, { contentType: "image/jpeg", upsert: false });

  if (uploadError) throw new Error(uploadError.message);

  const { data: existingPhotos } = await supabase
    .from("photos")
    .select("sequence")
    .eq("job_id", jobId)
    .order("sequence", { ascending: false })
    .limit(1);

  const sequence = (existingPhotos?.[0]?.sequence ?? -1) + 1;

  const { data: inserted, error: insertError } = await supabase
    .from("photos")
    .insert({
      job_id: jobId,
      room_type: roomType,
      sequence,
      original_key: storageKey,
    })
    .select("id")
    .single();

  if (insertError || !inserted) throw new Error(insertError?.message ?? "Could not save photo");

  return { photoId: inserted.id, storageKey, sequence };
}
