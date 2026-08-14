import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { NextResponse } from "next/server";

/** Reorder photos by sequence (draft only). Body: { photoIds: string[] } */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  let body: { photoIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const photoIds = body.photoIds;
  if (!Array.isArray(photoIds) || photoIds.length === 0) {
    return NextResponse.json({ error: "photoIds array required" }, { status: 400 });
  }

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "draft") {
    return NextResponse.json({ error: "Can only reorder photos on draft projects" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("photos")
    .select("id")
    .eq("job_id", jobId);

  const existingIds = new Set((existing ?? []).map((p) => p.id));
  if (photoIds.length !== existingIds.size || photoIds.some((pid) => !existingIds.has(pid))) {
    return NextResponse.json({ error: "photoIds must match all photos in the project" }, { status: 400 });
  }

  for (let i = 0; i < photoIds.length; i++) {
    const { error } = await supabase
      .from("photos")
      .update({ sequence: i + 1 })
      .eq("id", photoIds[i])
      .eq("job_id", jobId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
