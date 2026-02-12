import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const BUCKET = "wiselista-photos";

/** Delete one photo (storage + DB). Only allowed when job is draft. User must own the job. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId, photoId } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job || job.status !== "draft") {
    return NextResponse.json({ error: "Job not found or not draft" }, { status: 400 });
  }

  const { data: photo } = await supabase
    .from("photos")
    .select("original_key, edited_key")
    .eq("id", photoId)
    .eq("job_id", jobId)
    .single();

  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const { error: deleteError } = await supabase.from("photos").delete().eq("id", photoId);
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });

  const keys = [photo.original_key, photo.edited_key].filter(Boolean) as string[];
  if (keys.length) {
    try {
      const service = createServiceClient();
      await service.storage.from(BUCKET).remove(keys);
    } catch {
      // Best-effort: photo row already removed; storage cleanup can be retried later
    }
  }
  return NextResponse.json({ ok: true });
}
