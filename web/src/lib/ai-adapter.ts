/**
 * AI review adapter — send job for AI editing, one place for prompts.
 * No "coded prompt every time": prompts live in prompts.ts (default + per-room).
 *
 * Flow:
 * 1. Submit API calls triggerMockAI (or processJobWithRealAI when CLAID_API_KEY set).
 * 2. Build payload: job + photos with originalUrl + prompt per photo (getEditPrompt(room_type)).
 * 3. Mock: copy original → edited, mark job ready (current behaviour).
 * 4. Real (Claid): call Claid /v1/image/edit per photo → download tmp_url → upload to storage → set edited_key → mark job ready.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { getEditPrompt, type RoomType } from "@/lib/prompts";

const BUCKET = "wiselista-photos";
const SIGNED_URL_EXPIRY_AI = 3600; // 1 hour for AI partner to fetch

const CLAID_API_URL = "https://api.claid.ai/v1";

/** Wiselista default: bright, clean, realistic. Real-estate upscale, HDR, mild manual tweaks. */
const CLAID_BASE_OPERATIONS = {
  restorations: {
    upscale: "smart_enhance" as const,
    decompress: "auto" as const,
    polish: false,
  },
  resizing: { fit: "bounds" as const, width: "150%", height: "150%" },
  adjustments: {
    hdr: { intensity: 100, stitching: false },
    exposure: 10,
    saturation: 10,
    contrast: 10,
    sharpness: 12,
  },
};

/** Room-specific adjustment overrides (merged over base). Exterior: punch. Kitchen/bath: neutral. */
const CLAID_ROOM_ADJUSTMENTS: Partial<
  Record<RoomType, { exposure?: number; saturation?: number; contrast?: number; sharpness?: number }>
> = {
  exterior: { saturation: 15, contrast: 15 },
  kitchen: { saturation: 5 },
  bathroom: { saturation: 5 },
  living_room: { exposure: 12 },
  bedroom: {},
  other: {},
};

const CLAID_OUTPUT = { format: { type: "jpeg" as const, quality: 88 } };

/** Build Claid operations for a room type (default + room overrides). */
function getClaidOperations(roomType: RoomType) {
  const base = { ...CLAID_BASE_OPERATIONS };
  const adjustments = { ...base.adjustments };
  const overrides = CLAID_ROOM_ADJUSTMENTS[roomType];
  if (overrides) {
    if (overrides.exposure !== undefined) adjustments.exposure = overrides.exposure;
    if (overrides.saturation !== undefined) adjustments.saturation = overrides.saturation;
    if (overrides.contrast !== undefined) adjustments.contrast = overrides.contrast;
    if (overrides.sharpness !== undefined) adjustments.sharpness = overrides.sharpness;
  }
  return { ...base, adjustments };
}

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
 * Call Claid /v1/image/edit with a signed image URL; returns temporary URL of enhanced image.
 * Uses room-specific operations (Wiselista default + room overrides). Requires CLAID_API_KEY.
 */
async function callClaidEdit(inputUrl: string, roomType: RoomType): Promise<string> {
  const apiKey = process.env.CLAID_API_KEY;
  if (!apiKey) throw new Error("CLAID_API_KEY not set");

  const operations = getClaidOperations(roomType);

  const res = await fetch(`${CLAID_API_URL}/image/edit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: inputUrl,
      operations,
      output: CLAID_OUTPUT,
    }),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(`Claid API error ${res.status}: ${err.message ?? res.statusText}`);
  }

  const data = (await res.json()) as { data?: { output?: { tmp_url?: string } } };
  const tmpUrl = data?.data?.output?.tmp_url;
  if (!tmpUrl) throw new Error("Claid response missing data.output.tmp_url");
  return tmpUrl;
}

/**
 * Process job with Claid: for each photo, call Claid edit → download result → upload to storage → set edited_key → mark job ready.
 * Must be awaited from the submit route (serverless kills fire-and-forget when the HTTP response returns).
 */
export async function processJobWithRealAI(jobId: string): Promise<void> {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    throw new Error(
      "AI processing requires SUPABASE_SERVICE_ROLE_KEY on the server (set in Amplify env vars)"
    );
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, user_id")
    .eq("id", jobId)
    .single();

  if (!job?.user_id) return;

  const requests = await buildAIRequests(jobId);
  if (!requests.length) {
    await supabase
      .from("jobs")
      .update({ status: "ready", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", jobId);
    return;
  }

  const userId = job.user_id as string;

  for (const r of requests) {
    try {
      const tmpUrl = await callClaidEdit(r.originalUrl, r.roomType);
      const imageRes = await fetch(tmpUrl);
      if (!imageRes.ok) throw new Error(`Failed to download Claid result: ${imageRes.status}`);
      const buffer = await imageRes.arrayBuffer();

      const editedKey = `${userId}/${jobId}/edited/${r.photoId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(editedKey, buffer, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      await supabase.from("photos").update({ edited_key: editedKey }).eq("id", r.photoId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      const failureMessage = `Photo ${r.photoId.slice(0, 8)}: ${message}`.slice(0, 500);
      console.error("[Claid]", {
        jobId,
        userId,
        photoId: r.photoId,
        error: message,
      });
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          failure_message: failureMessage,
          updated_at: new Date().toISOString(),
        })
        .eq("id", jobId);
      return;
    }
  }

  await supabase
    .from("jobs")
    .update({
      status: "ready",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
