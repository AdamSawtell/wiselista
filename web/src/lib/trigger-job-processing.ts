import { submitJobToMockAI } from "@/lib/ai-mock";
import { processJobWithRealAI } from "@/lib/ai-adapter";
import { createServiceClient } from "@/lib/supabase/server";

async function markJobFailed(jobId: string, message: string): Promise<void> {
  try {
    const supabase = createServiceClient();
    await supabase
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

/**
 * Run AI processing to completion. Must be awaited in API routes — fire-and-forget
 * is killed on Amplify/serverless when the HTTP response returns.
 */
export async function runJobProcessing(jobId: string): Promise<void> {
  try {
    if (process.env.CLAID_API_KEY) {
      console.info("[ProcessJob] running Claid", { jobId });
      await processJobWithRealAI(jobId);
    } else {
      console.info("[ProcessJob] running mock AI", { jobId });
      await submitJobToMockAI(jobId);
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[ProcessJob] failed", { jobId, error: message });
    await markJobFailed(jobId, message);
  }
}
