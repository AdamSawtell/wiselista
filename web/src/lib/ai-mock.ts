/**
 * Mock AI adapter: after a short delay, copies original to edited and marks job ready.
 * Prompts for real AI live in @/lib/prompts (default + per-room). When you wire a real
 * AI partner, use buildAIRequests(jobId) from @/lib/ai-adapter to get (originalUrl, prompt)
 * per photo — no coded prompt per job.
 */

import { createServiceClient } from "@/lib/supabase/server";

const MOCK_DELAY_MS = 2000;

export async function submitJobToMockAI(jobId: string): Promise<void> {
  const supabase = createServiceClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .single();

  if (!job) return;

  const { data: photos } = await supabase
    .from("photos")
    .select("id, original_key")
    .eq("job_id", jobId)
    .order("sequence");

  if (!photos?.length) {
    await supabase.from("jobs").update({ status: "ready", completed_at: new Date().toISOString() }).eq("id", jobId);
    return;
  }

  // Mock: set edited_key = original_key (no real edit). Real AI would use getEditPrompt(room_type) per photo.
  for (const p of photos) {
    await supabase
      .from("photos")
      .update({ edited_key: p.original_key })
      .eq("id", p.id);
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

/** Call after payment webhook; optionally delay to simulate async AI. */
export async function triggerMockAI(jobId: string, delayMs: number = MOCK_DELAY_MS): Promise<void> {
  if (delayMs <= 0) {
    await submitJobToMockAI(jobId);
    return;
  }
  setTimeout(() => submitJobToMockAI(jobId), delayMs);
}
