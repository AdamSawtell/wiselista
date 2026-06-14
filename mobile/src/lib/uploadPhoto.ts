import { supabase } from "./supabase";
import { getPlanConfig, normalizePlanTier } from "./plans";
import type { RoomType } from "../types";

export type UploadPhotoResult = {
  photoId: string;
  storageKey: string;
  sequence: number;
};

export type UploadPhotoOptions = {
  briefSlotId?: string | null;
};

/** Upload a captured image to storage and insert the photo row. */
export async function uploadJobPhoto(
  userId: string,
  jobId: string,
  imageUri: string,
  roomType: RoomType,
  options?: UploadPhotoOptions
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

  const briefSlotId = options?.briefSlotId?.trim() || null;

  if (briefSlotId) {
    const { data: existing } = await supabase
      .from("photos")
      .select("id, original_key")
      .eq("job_id", jobId)
      .eq("brief_slot_id", briefSlotId)
      .maybeSingle();

    if (existing) {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storageKey = `${userId}/${jobId}/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("wiselista-photos")
        .upload(storageKey, blob, { contentType: "image/jpeg", upsert: false });

      if (uploadError) throw new Error(uploadError.message);

      const { data: updated, error: updateError } = await supabase
        .from("photos")
        .update({ room_type: roomType, original_key: storageKey })
        .eq("id", existing.id)
        .select("id, sequence")
        .single();

      if (updateError || !updated) throw new Error(updateError?.message ?? "Could not save photo");

      if (existing.original_key) {
        await supabase.storage.from("wiselista-photos").remove([existing.original_key]);
      }

      return { photoId: updated.id, storageKey, sequence: updated.sequence };
    }
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
      brief_slot_id: briefSlotId,
    })
    .select("id")
    .single();

  if (insertError || !inserted) throw new Error(insertError?.message ?? "Could not save photo");

  return { photoId: inserted.id, storageKey, sequence };
}
