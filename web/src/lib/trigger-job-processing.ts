import { triggerMockAI } from "@/lib/ai-mock";
import { processJobWithRealAI } from "@/lib/ai-adapter";

/** Start AI processing after payment (mock or Claid when CLAID_API_KEY is set). */
export function triggerJobProcessing(jobId: string): void {
  if (process.env.CLAID_API_KEY) {
    console.info("[ProcessJob] triggering Claid", { jobId });
    void processJobWithRealAI(jobId);
  } else {
    triggerMockAI(jobId);
  }
}
