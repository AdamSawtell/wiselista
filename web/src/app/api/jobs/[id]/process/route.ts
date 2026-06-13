import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { runJobProcessing } from "@/lib/trigger-job-processing";
import { NextResponse } from "next/server";

/** Claid can take ~20s per photo; allow enough time on serverless. */
export const maxDuration = 300;

/**
 * Run (or resume) AI processing for a job. Called from the dashboard while the user
 * waits — avoids relying on the Stripe webhook Lambda timeout on Amplify.
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

  if (job.status !== "processing") {
    return NextResponse.json(
      { error: "Processing can only be started when the project is enhancing" },
      { status: 400 }
    );
  }

  const { data: photos } = await supabase.from("photos").select("id, edited_key").eq("job_id", jobId);
  const pending = (photos ?? []).filter((p) => !p.edited_key).length;
  if (!photos?.length) {
    return NextResponse.json({ error: "No photos to process" }, { status: 400 });
  }

  console.info("[Process] starting/resuming", { jobId, userId: user.id, pending, total: photos.length });
  await runJobProcessing(jobId);

  const { data: updated } = await supabase.from("jobs").select("status, failure_message").eq("id", jobId).single();

  return NextResponse.json({
    status: updated?.status ?? "processing",
    failure_message: updated?.failure_message ?? null,
  });
}
