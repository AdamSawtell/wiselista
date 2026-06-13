import { submitJobToMockAI } from "@/lib/ai-mock";
import { processJobWithRealAI } from "@/lib/ai-adapter";
import { createServiceClient, getServiceClientOrNull, type SupabaseClient } from "@/lib/supabase/server";

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
  if (supabase) return supabase;
  return createServiceClient();
}

/**
 * Run AI processing to completion. Must be awaited in API routes — fire-and-forget
 * is killed on Amplify/serverless when the HTTP response returns.
 *
 * Pass the authenticated Supabase client from the request when the service role
 * key is not available on the host (e.g. missing on Amplify).
 */
export async function runJobProcessing(
  jobId: string,
  supabase?: SupabaseClient | null
): Promise<{ ok: boolean; error?: string; mode?: string }> {
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
      console.info("[ProcessJob] running Claid", { jobId });
      await processJobWithRealAI(jobId, db);
    } else {
      console.info("[ProcessJob] running mock AI", { jobId });
      await submitJobToMockAI(jobId, db);
    }
    return { ok: true, mode };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ProcessJob] failed", { jobId, error: message });
    await markJobFailed(jobId, message, db);
    return { ok: false, error: message, mode };
  }
}
