import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { runJobProcessing } from "@/lib/trigger-job-processing";
import { resetFailedPhotosForRetry, getJobAiProgress } from "@/lib/photo-ai-queue";
import { NextResponse } from "next/server";

/** Claid can take ~20s per photo; allow enough time on serverless. */
export const maxDuration = 300;

/** Node runtime required for CLAID_API_KEY + SUPABASE_SERVICE_ROLE_KEY on Amplify. */
export const runtime = "nodejs";

/**
 * Run (or resume) one AI photo for a job. Dashboard + mobile call this while waiting;
 * cron continues if the tab closes.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (job.status === "ready") {
    return NextResponse.json({ status: "ready", message: "Already complete" });
  }

  if (job.status === "failed") {
    try {
      await resetFailedPhotosForRetry(supabase, jobId);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 500 });
    }
    const { error: resetError } = await supabase
      .from("jobs")
      .update({
        status: "processing",
        failure_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("user_id", user.id);
    if (resetError) {
      return NextResponse.json({ error: resetError.message }, { status: 500 });
    }
  } else if (job.status !== "processing") {
    return NextResponse.json(
      {
        error:
          "Processing can only be started when the project is enhancing or retrying after failure",
      },
      { status: 400 }
    );
  }

  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);
  if (!count) {
    return NextResponse.json({ error: "No photos to process" }, { status: 400 });
  }

  console.info("[Process] starting/resuming", { jobId, userId: user.id, total: count });
  const result = await runJobProcessing(jobId, supabase);

  const progress = result.progress ?? (await getJobAiProgress(supabase, jobId));
  const status = result.status ?? "processing";

  if (status === "failed" && progress.ready === 0) {
    return NextResponse.json(
      {
        status: "failed",
        failure_message: result.error ?? "Processing failed",
        mode: result.mode,
        current: progress.current,
        total: progress.total,
        ready: progress.ready,
        failed: progress.failed,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status,
    failure_message: status === "failed" ? result.error ?? null : null,
    mode: result.mode,
    photoId: result.photoId,
    current: progress.current,
    total: progress.total,
    ready: progress.ready,
    failed: progress.failed,
  });
}
