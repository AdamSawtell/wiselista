/**
 * Mock AI adapter: copies original to edited and marks job ready.
 */

import { createServiceClient, type SupabaseClient } from "@/lib/supabase/server";
import { finalizeJobFromPhotoState, markPhotoReady } from "@/lib/photo-ai-queue";

export async function submitJobToMockAI(jobId: string, supabase?: SupabaseClient): Promise<void> {
  const db = supabase ?? createServiceClient();

  const { data: job } = await db.from("jobs").select("id").eq("id", jobId).single();

  if (!job) {
    throw new Error(`Mock AI: job ${jobId} not found`);
  }

  const { data: photos } = await db
    .from("photos")
    .select("id, original_key, edited_key")
    .eq("job_id", jobId)
    .order("sequence");

  for (const p of photos ?? []) {
    if (p.edited_key) continue;
    await markPhotoReady(db, p.id, p.original_key);
  }

  await finalizeJobFromPhotoState(db, jobId);
}

/** @deprecated Use submitJobToMockAI directly — setTimeout is unreliable on serverless. */
export async function triggerMockAI(jobId: string, _delayMs?: number): Promise<void> {
  await submitJobToMockAI(jobId);
}
