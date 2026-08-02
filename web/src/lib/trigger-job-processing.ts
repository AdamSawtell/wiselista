import { submitJobToMockAI } from "@/lib/ai-mock";
import { processJobWithRealAI } from "@/lib/ai-adapter";
import { createServiceClient, getServiceClientOrNull, type SupabaseClient } from "@/lib/supabase/server";
import { getJobAiProgress } from "@/lib/photo-ai-queue";

async function markJobFailed(
  jobId: string,
  message: string,
  supabase?: SupabaseClient | null
): Promise<void> {
  try {
    const db = supabase ?? getServiceClientOrNull();
    if (!db) return;
    await db
      .from("jobs")
      .update({
        status: "failed",
        failure_message: message.slice(0, 500),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
  } catch (e) {
    console.error("[ProcessJob] could not mark job failed", { jobId, error: e });
  }
}

function resolveProcessingClient(supabase?: SupabaseClient | null): SupabaseClient {
  // Prefer service role so claim RPC + storage writes are reliable on Amplify.
  const service = getServiceClientOrNull();
  if (service) return service;
  if (supabase) return supabase;
  return createServiceClient();
}

export type RunJobProcessingResult = {
  ok: boolean;
  error?: string;
  mode?: string;
  status?: string;
  photoId?: string;
  progress?: { current: number; total: number; ready: number; failed: number };
};

/**
 * Run one AI processing step (one photo for Claid). Must be awaited in API routes.
 */
export async function runJobProcessing(
  jobId: string,
  supabase?: SupabaseClient | null
): Promise<RunJobProcessingResult> {
  const mode = process.env.CLAID_API_KEY ? "claid" : "mock";
  let db: SupabaseClient;
  try {
    db = resolveProcessingClient(supabase);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { ok: false, error: message, mode };
  }

  try {
    if (process.env.CLAID_API_KEY) {
      console.info("[ProcessJob] running Claid step", { jobId });
      const result = await processJobWithRealAI(jobId, db);
      return {
        ok: true,
        mode,
        status: result.status,
        photoId: result.photoId,
        progress: result.progress,
        error: result.status === "failed" ? "One or more photos failed after retries" : undefined,
      };
    }

    console.info("[ProcessJob] running mock AI", { jobId });
    await submitJobToMockAI(jobId, db);
    const progress = await getJobAiProgress(db, jobId);
    return {
      ok: true,
      mode,
      status: "ready",
      progress: {
        current: progress.current,
        total: progress.total,
        ready: progress.ready,
        failed: progress.failed,
      },
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ProcessJob] failed", { jobId, error: message });
    await markJobFailed(jobId, message, db);
    return { ok: false, error: message, mode, status: "failed" };
  }
}
