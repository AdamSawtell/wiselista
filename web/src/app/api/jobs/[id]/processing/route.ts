import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
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
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job, error } = await supabase
    .from("jobs")
    .select(
      "status, processing_photo_index, processing_photo_total, processing_started_at, completed_at, failure_message"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    status: job.status,
    current: job.processing_photo_index ?? 0,
    total: job.processing_photo_total ?? 0,
    startedAt: job.processing_started_at,
    completedAt: job.completed_at,
    failureMessage: job.failure_message ?? null,
  });
}
