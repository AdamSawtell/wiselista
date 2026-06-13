import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, getServiceClientOrNull } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const BUCKET = "wiselista-photos";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: photos } = await supabase
    .from("photos")
    .select("id, room_type, sequence, original_key, edited_key, created_at")
    .eq("job_id", id)
    .order("sequence");

  return NextResponse.json({ ...job, photos: photos ?? [] });
}

/** Update job metadata (e.g. project name). User must own the job. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.name === undefined) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const trimmed = typeof body.name === "string" ? body.name.trim() : "";
  if (trimmed.length > 120) {
    return NextResponse.json({ error: "Name must be 120 characters or fewer" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data, error } = await supabase
    .from("jobs")
    .update({ name: trimmed || null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, status, created_at, updated_at")
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

/** Delete job and all its photos (DB + storage). User must own the job. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const supabase = token
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
    : await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: photos } = await supabase
    .from("photos")
    .select("original_key, edited_key")
    .eq("job_id", jobId);

  const service = getServiceClientOrNull();
  if (photos?.length && service) {
    const keys = photos.flatMap((p) => [p.original_key, p.edited_key].filter(Boolean)) as string[];
    if (keys.length) {
      const { error: storageError } = await service.storage.from(BUCKET).remove(keys);
      if (storageError) {
        console.warn("[DeleteJob] storage cleanup failed:", storageError.message, { jobId });
      }
    }
  }

  const { error: deleteError } = await supabase.from("jobs").delete().eq("id", jobId).eq("user_id", user.id);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
