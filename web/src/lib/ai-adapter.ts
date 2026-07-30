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

import { createServiceClient, type SupabaseClient } from "@/lib/supabase/server";
import { computeExpiresAt, normalizePlanTier } from "@/lib/plans";
import { getEditPrompt, type RoomType } from "@/lib/prompts";

const BUCKET = "wiselista-photos";

async function markJobReady(supabase: SupabaseClient, jobId: string) {
  const completedAt = new Date();
  const { data: job } = await supabase.from("jobs").select("plan_tier").eq("id", jobId).single();
  const expiresAt = computeExpiresAt(completedAt, normalizePlanTier(job?.plan_tier));

  const { error } = await supabase
    .from("jobs")
    .update({
      status: "ready",
      completed_at: completedAt.toISOString(),
      expires_at: expiresAt,
      updated_at: completedAt.toISOString(),
      processing_photo_index: null,
      processing_photo_total: null,
      processing_started_at: null,
    })
    .eq("id", jobId);

  if (error) throw new Error(`Could not mark job ready: ${error.message}`);
}
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
export async function buildAIRequests(jobId: string, supabase?: SupabaseClient): Promise<AIPhotoRequest[]> {
  const db = supabase ?? createServiceClient();

  const { data: photos } = await db
    .from("photos")
    .select("id, original_key, room_type, edited_key")
    .eq("job_id", jobId)
    .order("sequence");

  if (!photos?.length) return [];

  const requests: AIPhotoRequest[] = [];

  for (const p of photos) {
    if (p.edited_key) continue;
    const { data: signed } = await db.storage
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
    const err = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
    if (res.status === 402) {
      throw new Error(
        "Claid API credits required — web/editor credits in your Claid dashboard do not apply to the REST API. " +
          "Purchase API credits at claid.ai/api-pricing (Integrations → API). Free trial includes 50 API credits."
      );
    }
    throw new Error(`Claid API error ${res.status}: ${err.message ?? err.error ?? res.statusText}`);
  }

  const data = (await res.json()) as { data?: { output?: { tmp_url?: string } } };
  const tmpUrl = data?.data?.output?.tmp_url;
  if (!tmpUrl) throw new Error("Claid response missing data.output.tmp_url");
  return tmpUrl;
}

function isTransientFetchError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /fetch failed|network|ECONNRESET|ETIMEDOUT|socket|UND_ERR/i.test(message);
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok && res.status >= 500 && i < attempts - 1) {
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
        continue;
      }
      return res;
    } catch (e) {
      lastError = e;
      if (!isTransientFetchError(e) || i === attempts - 1) throw e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function uploadClaidResult(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  photoId: string,
  roomType: RoomType,
  originalUrl: string
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const tmpUrl = await callClaidEdit(originalUrl, roomType);
      const imageRes = await fetchWithRetry(tmpUrl);
      if (!imageRes.ok) throw new Error(`Failed to download Claid result: ${imageRes.status}`);
      const buffer = await imageRes.arrayBuffer();

      const editedKey = `${userId}/${jobId}/edited/${photoId}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(editedKey, buffer, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;
      await supabase.from("photos").update({ edited_key: editedKey }).eq("id", photoId);
      return;
    } catch (e) {
      lastError = e;
      if (!isTransientFetchError(e) || attempt === 3) throw e;
      console.warn("[Claid] transient error, retrying photo", { photoId, attempt, error: e instanceof Error ? e.message : e });
      await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** Re-enhance a single photo (job stays ready). */
export async function reprocessPhotoWithClaid(
  jobId: string,
  photoId: string,
  supabase?: SupabaseClient
): Promise<void> {
  const db = supabase ?? createServiceClient();
  const { data: job } = await db
    .from("jobs")
    .select("id, user_id, status")
    .eq("id", jobId)
    .single();

  if (!job?.user_id) throw new Error("Job not found");
  if (job.status !== "ready") throw new Error("Can only re-enhance photos on ready projects");

  const { data: photo } = await db
    .from("photos")
    .select("id, original_key, room_type")
    .eq("id", photoId)
    .eq("job_id", jobId)
    .single();

  if (!photo) throw new Error("Photo not found");

  const { data: signed } = await db.storage
    .from(BUCKET)
    .createSignedUrl(photo.original_key, SIGNED_URL_EXPIRY_AI);

  if (!signed?.signedUrl) throw new Error("Could not sign photo URL");

  await uploadClaidResult(
    db,
    job.user_id,
    jobId,
    photoId,
    photo.room_type as RoomType,
    signed.signedUrl
  );
}

/**
 * Process job with Claid — one photo per invocation so Amplify ~30s timeouts can resume.
 * Dashboard ProcessingProgress keeps calling /process until all photos have edited_key.
 */
export async function processJobWithRealAI(jobId: string, supabase?: SupabaseClient): Promise<void> {
  const db = supabase ?? createServiceClient();

  const { data: job } = await db
    .from("jobs")
    .select("id, user_id")
    .eq("id", jobId)
    .single();

  if (!job?.user_id) {
    throw new Error(`Claid: job ${jobId} not found or missing user_id`);
  }

  const { count: totalCount } = await db
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  const requests = await buildAIRequests(jobId, db);
  if (!requests.length) {
    await markJobReady(db, jobId);
    return;
  }

  const total = totalCount ?? requests.length;
  const doneBefore = total - requests.length;
  const startedAt = new Date().toISOString();

  await db
    .from("jobs")
    .update({
      status: "processing",
      failure_message: null,
      processing_photo_total: total,
      processing_photo_index: doneBefore + 1,
      processing_started_at: startedAt,
      updated_at: startedAt,
    })
    .eq("id", jobId);

  // One photo per request — Amplify often kills long multi-photo Claid runs.
  const r = requests[0];
  try {
    await uploadClaidResult(db, job.user_id, jobId, r.photoId, r.roomType, r.originalUrl);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const failureMessage = `Photo ${r.photoId.slice(0, 8)}: ${message}`.slice(0, 500);
    console.error("[Claid]", { jobId, userId: job.user_id, photoId: r.photoId, error: message });
    await db
      .from("jobs")
      .update({
        status: "failed",
        failure_message: failureMessage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return;
  }

  const remaining = await buildAIRequests(jobId, db);
  if (!remaining.length) {
    await markJobReady(db, jobId);
    return;
  }

  await db
    .from("jobs")
    .update({
      status: "processing",
      processing_photo_index: doneBefore + 1,
      processing_photo_total: total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}
