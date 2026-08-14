import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { getJobAiProgress } from "@/lib/photo-ai-queue";
import { NextResponse } from "next/server";

/** Poll processing progress while job status is processing. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: job, error } = await supabase
    .from("jobs")
    .select("status, processing_started_at, completed_at, failure_message")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let progress = { current: 0, total: 0, ready: 0, failed: 0, pending: 0, processing: 0 };
  try {
    progress = await getJobAiProgress(supabase, id);
  } catch {
    // older DBs without ai_* columns still work via job fields below
  }

  return NextResponse.json({
    status: job.status,
    current: progress.ready > 0 || progress.processing > 0 ? progress.current : progress.ready,
    total: progress.total,
    ready: progress.ready,
    failed: progress.failed,
    pending: progress.pending,
    processing: progress.processing,
    startedAt: job.processing_started_at,
    completedAt: job.completed_at,
    failureMessage: job.failure_message ?? null,
  });
}
