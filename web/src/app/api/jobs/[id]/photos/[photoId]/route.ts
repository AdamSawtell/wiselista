import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { NextResponse } from "next/server";

const BUCKET = "wiselista-photos";

/** Delete one photo (storage + DB). Only allowed when job is draft. User must own the job. Supports cookie (web) or Bearer token (mobile). */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id: jobId, photoId } = await params;
  const authHeader = request.headers.get("authorization");
  const hasBearer = authHeader?.startsWith("Bearer ");
  console.info("[DeletePhoto]", { jobId, photoId, hasBearer });

  const user = await getApiUser(request);
  if (!user) {
    console.warn("[DeletePhoto] Unauthorized: no user from getApiUser");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = hasBearer ? authHeader!.slice(7) : null;
  const supabase = token
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
    : await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError) {
    console.warn("[DeletePhoto] job fetch error", { jobId, error: jobError.message });
    return NextResponse.json({ error: "Job not found or not draft" }, { status: 400 });
  }
  if (!job || job.status !== "draft") {
    return NextResponse.json({ error: "Job not found or not draft" }, { status: 400 });
  }

  const { data: photo, error: photoError } = await supabase
    .from("photos")
    .select("original_key, edited_key")
    .eq("id", photoId)
    .eq("job_id", jobId)
    .single();

  if (photoError || !photo) {
    console.warn("[DeletePhoto] photo not found", { photoId, error: photoError?.message });
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("photos").delete().eq("id", photoId);
  if (deleteError) {
    console.error("[DeletePhoto] delete row failed", { photoId, error: deleteError.message });
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  const keys = [photo.original_key, photo.edited_key].filter(Boolean) as string[];
  if (keys.length) {
    try {
      const service = createServiceClient();
      await service.storage.from(BUCKET).remove(keys);
    } catch {
      // Best-effort: photo row already removed; storage cleanup can be retried later
    }
  }
  console.info("[DeletePhoto] success", { jobId, photoId });
  return NextResponse.json({ ok: true });
}
