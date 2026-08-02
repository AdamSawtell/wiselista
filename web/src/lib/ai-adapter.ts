/**
 * AI review adapter — send job for AI editing, one place for prompts.
 *
 * Flow:
 * 1. Submit moves job to processing.
 * 2. /process or cron claims ONE photo, runs Claid, marks photo ready/failed.
 * 3. Finalize job when no retryable photos remain.
 */

import { createServiceClient, type SupabaseClient } from "@/lib/supabase/server";
import { getEditPrompt, type RoomType } from "@/lib/prompts";
import {
  AI_MAX_ATTEMPTS,
  claimNextPhoto,
  ensurePhotosQueued,
  finalizeJobFromPhotoState,
  getJobAiProgress,
  markPhotoAttemptFailed,
  markPhotoReady,
} from "@/lib/photo-ai-queue";

const BUCKET = "wiselista-photos";
const SIGNED_URL_EXPIRY_AI = 3600;
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

/** @deprecated Prefer claimNextPhoto — kept for scripts/tests that list pending work. */
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
  return /fetch failed|network|ECONNRESET|ETIMEDOUT|socket|UND_ERR|Claid API error 5/i.test(message);
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

async function enhanceAndStorePhoto(
  supabase: SupabaseClient,
  userId: string,
  jobId: string,
  photoId: string,
  roomType: RoomType,
  originalUrl: string
): Promise<string> {
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
      await markPhotoReady(supabase, photoId, editedKey);
      return editedKey;
    } catch (e) {
      lastError = e;
      if (!isTransientFetchError(e) || attempt === 3) throw e;
      console.warn("[Claid] transient error, retrying photo", {
        photoId,
        attempt,
        error: e instanceof Error ? e.message : e,
      });
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

  await enhanceAndStorePhoto(
    db,
    job.user_id,
    jobId,
    photoId,
    photo.room_type as RoomType,
    signed.signedUrl
  );
}

export type ProcessJobResult = {
  status: "ready" | "failed" | "processing";
  photoId?: string;
  progress: { current: number; total: number; ready: number; failed: number };
};

/**
 * Process at most one claimed photo for a job, then finalize status.
 * Safe under Amplify timeouts; cron + UI keep calling until done.
 */
export async function processJobWithRealAI(
  jobId: string,
  supabase?: SupabaseClient
): Promise<ProcessJobResult> {
  const db = supabase ?? createServiceClient();

  const { data: job } = await db
    .from("jobs")
    .select("id, user_id")
    .eq("id", jobId)
    .single();

  if (!job?.user_id) {
    throw new Error(`Claid: job ${jobId} not found or missing user_id`);
  }

  await ensurePhotosQueued(db, jobId);

  const startedAt = new Date().toISOString();
  await db
    .from("jobs")
    .update({
      status: "processing",
      failure_message: null,
      processing_started_at: startedAt,
      updated_at: startedAt,
    })
    .eq("id", jobId);

  const claimed = await claimNextPhoto(db, jobId);
  if (!claimed) {
    const status = await finalizeJobFromPhotoState(db, jobId);
    const progress = await getJobAiProgress(db, jobId);
    return {
      status,
      progress: {
        current: progress.current,
        total: progress.total,
        ready: progress.ready,
        failed: progress.failed,
      },
    };
  }

  const progressBefore = await getJobAiProgress(db, jobId);
  await db
    .from("jobs")
    .update({
      processing_photo_index: Math.max(1, progressBefore.ready + 1),
      processing_photo_total: progressBefore.total,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  const { data: signed } = await db.storage
    .from(BUCKET)
    .createSignedUrl(claimed.original_key, SIGNED_URL_EXPIRY_AI);

  if (!signed?.signedUrl) {
    await markPhotoAttemptFailed(db, claimed.id, claimed.ai_attempts, "Could not sign photo URL");
    const status = await finalizeJobFromPhotoState(db, jobId);
    const progress = await getJobAiProgress(db, jobId);
    return {
      status,
      photoId: claimed.id,
      progress: {
        current: progress.current,
        total: progress.total,
        ready: progress.ready,
        failed: progress.failed,
      },
    };
  }

  try {
    await enhanceAndStorePhoto(
      db,
      job.user_id,
      jobId,
      claimed.id,
      claimed.room_type as RoomType,
      signed.signedUrl
    );
    console.info("[Claid] photo ready", {
      jobId,
      photoId: claimed.id,
      attempt: claimed.ai_attempts,
      max: AI_MAX_ATTEMPTS,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[Claid]", {
      jobId,
      userId: job.user_id,
      photoId: claimed.id,
      attempt: claimed.ai_attempts,
      error: message,
    });
    await markPhotoAttemptFailed(db, claimed.id, claimed.ai_attempts, message);
  }

  const status = await finalizeJobFromPhotoState(db, jobId);
  const progress = await getJobAiProgress(db, jobId);
  return {
    status,
    photoId: claimed.id,
    progress: {
      current: progress.current,
      total: progress.total,
      ready: progress.ready,
      failed: progress.failed,
    },
  };
}
