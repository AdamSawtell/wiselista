/**
 * Photo-level AI queue helpers — claim, progress, finalize.
 * One photo per process invocation; cron resumes without an open browser.
 */

import type { SupabaseClient } from "@/lib/supabase/server";
import { computeExpiresAt, normalizePlanTier } from "@/lib/plans";

export const AI_MAX_ATTEMPTS = 3;
export const AI_STALE_SECONDS = 120;

export type PhotoAiStatus = "pending" | "processing" | "ready" | "failed";

export type ClaimedPhoto = {
  id: string;
  job_id: string;
  original_key: string;
  room_type: string;
  sequence: number;
  ai_attempts: number;
  ai_status: PhotoAiStatus;
};

export type JobAiProgress = {
  total: number;
  ready: number;
  failed: number;
  pending: number;
  processing: number;
  /** 1-based index of photos completed or in-flight for UI */
  current: number;
};

export async function ensurePhotosQueued(
  db: SupabaseClient,
  jobId: string
): Promise<void> {
  await db
    .from("photos")
    .update({ ai_status: "pending", ai_last_error: null })
    .eq("job_id", jobId)
    .is("edited_key", null)
    .in("ai_status", ["ready"]);

  // New uploads default to pending; reset exhausted failures only via explicit retry.
}

/** Reset failed/retryable photos so Try again can re-run Claid. */
export async function resetFailedPhotosForRetry(
  db: SupabaseClient,
  jobId: string
): Promise<number> {
  const { data, error } = await db
    .from("photos")
    .update({
      ai_status: "pending",
      ai_attempts: 0,
      ai_last_error: null,
      ai_claimed_at: null,
    })
    .eq("job_id", jobId)
    .is("edited_key", null)
    .select("id");

  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function claimNextPhoto(
  db: SupabaseClient,
  jobId: string
): Promise<ClaimedPhoto | null> {
  const { data, error } = await db.rpc("claim_next_photo_for_job", {
    p_job_id: jobId,
    p_max_attempts: AI_MAX_ATTEMPTS,
    p_stale_seconds: AI_STALE_SECONDS,
  });

  if (error) {
    // Fallback if migration RPC not applied yet — best-effort claim via update.
    console.warn("[PhotoQueue] RPC claim failed, using fallback:", error.message);
    return claimNextPhotoFallback(db, jobId);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) return null;
  return row as ClaimedPhoto;
}

async function claimNextPhotoFallback(
  db: SupabaseClient,
  jobId: string
): Promise<ClaimedPhoto | null> {
  const staleBefore = new Date(Date.now() - AI_STALE_SECONDS * 1000).toISOString();

  // Prefer queue columns; fall back to next photo without edited_key.
  const withAi = await db
    .from("photos")
    .select("id, job_id, original_key, room_type, sequence, ai_attempts, ai_status, ai_claimed_at, edited_key")
    .eq("job_id", jobId)
    .is("edited_key", null)
    .order("sequence", { ascending: true })
    .limit(20);

  let candidates = withAi.data;
  if (withAi.error) {
    const basic = await db
      .from("photos")
      .select("id, job_id, original_key, room_type, sequence, edited_key")
      .eq("job_id", jobId)
      .is("edited_key", null)
      .order("sequence", { ascending: true })
      .limit(1);
    if (basic.error || !basic.data?.[0]) return null;
    const row = basic.data[0];
    return {
      id: row.id,
      job_id: row.job_id,
      original_key: row.original_key,
      room_type: row.room_type,
      sequence: row.sequence,
      ai_attempts: 1,
      ai_status: "processing",
    };
  }

  const next = (candidates ?? []).find((p) => {
    const attempts = p.ai_attempts ?? 0;
    if (attempts >= AI_MAX_ATTEMPTS) return false;
    if (!p.ai_status || p.ai_status === "pending" || p.ai_status === "failed") return true;
    if (p.ai_status === "processing") {
      return !p.ai_claimed_at || p.ai_claimed_at < staleBefore;
    }
    return false;
  });
  if (!next) return null;

  const { data: claimed, error } = await db
    .from("photos")
    .update({
      ai_status: "processing",
      ai_claimed_at: new Date().toISOString(),
      ai_attempts: (next.ai_attempts ?? 0) + 1,
      ai_last_error: null,
    })
    .eq("id", next.id)
    .is("edited_key", null)
    .select("id, job_id, original_key, room_type, sequence, ai_attempts, ai_status")
    .maybeSingle();

  if (!error && claimed) return claimed as ClaimedPhoto;

  // Columns missing or race — still process this photo once
  return {
    id: next.id,
    job_id: next.job_id,
    original_key: next.original_key,
    room_type: next.room_type,
    sequence: next.sequence,
    ai_attempts: (next.ai_attempts ?? 0) + 1,
    ai_status: "processing",
  };
}

export async function markPhotoReady(
  db: SupabaseClient,
  photoId: string,
  editedKey: string
): Promise<void> {
  const { error } = await db
    .from("photos")
    .update({
      edited_key: editedKey,
      ai_status: "ready",
      ai_last_error: null,
      ai_claimed_at: null,
    })
    .eq("id", photoId);
  if (!error) return;
  // Pre-migration DBs: edited_key only
  const { error: fallbackError } = await db
    .from("photos")
    .update({ edited_key: editedKey })
    .eq("id", photoId);
  if (fallbackError) throw new Error(fallbackError.message);
}

export async function markPhotoAttemptFailed(
  db: SupabaseClient,
  photoId: string,
  attempts: number,
  message: string
): Promise<"retryable" | "exhausted"> {
  const exhausted = attempts >= AI_MAX_ATTEMPTS;
  const { error } = await db
    .from("photos")
    .update({
      ai_status: exhausted ? "failed" : "pending",
      ai_last_error: message.slice(0, 500),
      ai_claimed_at: null,
    })
    .eq("id", photoId);
  if (error) {
    console.warn("[PhotoQueue] could not persist photo failure state", error.message);
  }
  return exhausted ? "exhausted" : "retryable";
}

export async function getJobAiProgress(
  db: SupabaseClient,
  jobId: string
): Promise<JobAiProgress> {
  let photos: Array<{ edited_key: string | null; ai_status?: string | null }> | null = null;

  const withAi = await db.from("photos").select("edited_key, ai_status").eq("job_id", jobId);
  if (withAi.error) {
    const basic = await db.from("photos").select("edited_key").eq("job_id", jobId);
    if (basic.error) throw new Error(basic.error.message);
    photos = basic.data;
  } else {
    photos = withAi.data;
  }

  const total = photos?.length ?? 0;
  let ready = 0;
  let failed = 0;
  let pending = 0;
  let processing = 0;

  for (const p of photos ?? []) {
    if (p.edited_key || p.ai_status === "ready") {
      ready += 1;
      continue;
    }
    if (p.ai_status === "failed") {
      failed += 1;
      continue;
    }
    if (p.ai_status === "processing") {
      processing += 1;
      continue;
    }
    pending += 1;
  }

  return {
    total,
    ready,
    failed,
    pending,
    processing,
    current: Math.min(total, ready + processing),
  };
}

export async function finalizeJobFromPhotoState(
  db: SupabaseClient,
  jobId: string
): Promise<"ready" | "failed" | "processing"> {
  const progress = await getJobAiProgress(db, jobId);

  if (progress.total === 0) {
    await markJobReady(db, jobId);
    return "ready";
  }

  const unfinished = progress.pending + progress.processing;
  if (unfinished > 0) {
    await db
      .from("jobs")
      .update({
        status: "processing",
        failure_message: null,
        processing_photo_index: progress.current,
        processing_photo_total: progress.total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return "processing";
  }

  if (progress.failed > 0) {
    const { data: failedPhoto } = await db
      .from("photos")
      .select("id, ai_last_error")
      .eq("job_id", jobId)
      .eq("ai_status", "failed")
      .limit(1)
      .maybeSingle();

    const msg = (
      failedPhoto?.ai_last_error
        ? `Photo ${failedPhoto.id.slice(0, 8)}: ${failedPhoto.ai_last_error}`
        : `${progress.failed} photo(s) failed after retries`
    ).slice(0, 500);

    await db
      .from("jobs")
      .update({
        status: "failed",
        failure_message: msg,
        processing_photo_index: progress.ready,
        processing_photo_total: progress.total,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return "failed";
  }

  await markJobReady(db, jobId);
  return "ready";
}

async function markJobReady(db: SupabaseClient, jobId: string): Promise<void> {
  const completedAt = new Date();
  const { data: job } = await db.from("jobs").select("plan_tier").eq("id", jobId).single();
  const expiresAt = computeExpiresAt(completedAt, normalizePlanTier(job?.plan_tier));

  const { error } = await db
    .from("jobs")
    .update({
      status: "ready",
      failure_message: null,
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

export async function listJobsNeedingProcessing(
  db: SupabaseClient,
  limit = 10
): Promise<string[]> {
  const { data, error } = await db.rpc("jobs_needing_ai_processing", {
    p_limit: limit,
  });

  if (!error && Array.isArray(data)) {
    return data.map((r: { job_id: string }) => r.job_id).filter(Boolean);
  }

  // Fallback without RPC
  const { data: jobs } = await db
    .from("jobs")
    .select("id, status, updated_at")
    .in("status", ["processing", "failed"])
    .order("updated_at", { ascending: true })
    .limit(50);

  const ids: string[] = [];
  for (const j of jobs ?? []) {
    const { count } = await db
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("job_id", j.id)
      .is("edited_key", null)
      .lt("ai_attempts", AI_MAX_ATTEMPTS);
    if ((count ?? 0) > 0) {
      ids.push(j.id);
    }
    if (ids.length >= limit) break;
  }
  return ids;
}
