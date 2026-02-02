/**
 * AI review adapter — send job for AI editing, one place for prompts.
 * No "coded prompt every time": prompts live in prompts.ts (default + per-room).
 *
 * Flow:
 * 1. Submit API calls triggerMockAI (or triggerRealAI when wired).
 * 2. Build payload: job + photos with originalUrl + prompt per photo (getEditPrompt(room_type)).
 * 3. Mock: copy original → edited, mark job ready (current behaviour).
 * 4. Real: call AI partner API with (originalUrl, prompt) per photo → upload result → set edited_key → mark job ready.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getEditPrompt, type RoomType } from "@/lib/prompts";

const BUCKET = "wiselista-photos";
const SIGNED_URL_EXPIRY_AI = 3600; // 1 hour for AI partner to fetch

export type AIPhotoRequest = {
  photoId: string;
  originalKey: string;
  originalUrl: string;
  roomType: RoomType;
  prompt: string;
};

/**
 * Build the payload to send to the AI partner: one request per photo with
 * original image URL and the prompt (default or room-specific from prompts.ts).
 * Use this when wiring the real AI: no prompt coded per job.
 */
export async function buildAIRequests(jobId: string): Promise<AIPhotoRequest[]> {
  const supabase = createServiceClient();

  const { data: photos } = await supabase
    .from("photos")
    .select("id, original_key, room_type")
    .eq("job_id", jobId)
    .order("sequence");

  if (!photos?.length) return [];

  const requests: AIPhotoRequest[] = [];

  for (const p of photos) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(p.original_key, SIGNED_URL_EXPIRY_AI);

    if (!signed?.signedUrl) continue;

    requests.push({
      photoId: p.id,
      originalKey: p.original_key,
      originalUrl: signed.signedUrl,
      roomType: p.room_type as RoomType,
      prompt: getEditPrompt(p.room_type as RoomType),
    });
  }

  return requests;
}

/**
 * Stub: call your AI partner here. For each item in buildAIRequests(jobId):
 * - POST imageUrl + prompt to partner API
 * - Partner returns edited image (URL or buffer)
 * - Upload to storage (e.g. same path with /edited/ or new key), set photo.edited_key
 * - Then mark job ready (and optionally notify user).
 *
 * Example (pseudo):
 *   const requests = await buildAIRequests(jobId);
 *   for (const r of requests) {
 *     const editedImage = await yourAIPartner.edit(r.originalUrl, r.prompt);
 *     const editedKey = await uploadToStorage(editedImage, jobId, r.photoId);
 *     await supabase.from("photos").update({ edited_key: editedKey }).eq("id", r.photoId);
 *   }
 *   await supabase.from("jobs").update({ status: "ready", completed_at: ... }).eq("id", jobId);
 */
export async function processJobWithRealAI(_jobId: string): Promise<void> {
  // TODO: Wire your AI partner. Use buildAIRequests(jobId) to get (originalUrl, prompt) per photo.
  throw new Error("Real AI not wired yet. Use mock.");
}
