/**
 * Mock AI adapter: copies original to edited and marks job ready.
 */

import { createServiceClient, type SupabaseClient } from "@/lib/supabase/server";
import { computeExpiresAt, normalizePlanTier } from "@/lib/plans";

export async function submitJobToMockAI(jobId: string, supabase?: SupabaseClient): Promise<void> {
  const db = supabase ?? createServiceClient();

  const { data: job } = await db
    .from("jobs")
    .select("id, plan_tier")
    .eq("id", jobId)
    .single();

  if (!job) {
    throw new Error(`Mock AI: job ${jobId} not found`);
  }

  const { data: photos } = await db
    .from("photos")
    .select("id, original_key, edited_key")
    .eq("job_id", jobId)
    .order("sequence");

  if (!photos?.length) {
    const completedAt = new Date();
    await db
      .from("jobs")
      .update({
        status: "ready",
        completed_at: completedAt.toISOString(),
        expires_at: computeExpiresAt(completedAt, normalizePlanTier(job.plan_tier)),
        processing_photo_index: null,
        processing_photo_total: null,
        processing_started_at: null,
        updated_at: completedAt.toISOString(),
      })
      .eq("id", jobId);
    return;
  }

  for (const p of photos) {
    if (p.edited_key) continue;
    await db.from("photos").update({ edited_key: p.original_key }).eq("id", p.id);
  }

  const completedAt = new Date();
  await db
    .from("jobs")
    .update({
      status: "ready",
      completed_at: completedAt.toISOString(),
      expires_at: computeExpiresAt(completedAt, normalizePlanTier(job.plan_tier)),
      processing_photo_index: null,
      processing_photo_total: null,
      processing_started_at: null,
      updated_at: completedAt.toISOString(),
    })
    .eq("id", jobId);
}

/** @deprecated Use submitJobToMockAI directly — setTimeout is unreliable on serverless. */
export async function triggerMockAI(jobId: string, _delayMs?: number): Promise<void> {
  await submitJobToMockAI(jobId);
}
