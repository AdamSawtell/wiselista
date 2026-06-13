import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { reprocessPhotoWithClaid } from "@/lib/ai-adapter";
import { NextResponse } from "next/server";

export const maxDuration = 120;
export const runtime = "nodejs";

/** Re-enhance a single photo on a ready project. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId, photoId } = await params;
  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "ready") {
    return NextResponse.json({ error: "Project must be ready to re-enhance a photo" }, { status: 400 });
  }

  try {
    if (process.env.CLAID_API_KEY) {
      await reprocessPhotoWithClaid(jobId, photoId, supabase);
    } else {
      const { data: photo } = await supabase
        .from("photos")
        .select("original_key")
        .eq("id", photoId)
        .eq("job_id", jobId)
        .single();
      if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
      await supabase.from("photos").update({ edited_key: photo.original_key }).eq("id", photoId);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Re-enhance failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
