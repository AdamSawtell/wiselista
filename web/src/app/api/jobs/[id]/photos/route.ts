import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { getPlanConfig } from "@/lib/plans";
import { NextResponse } from "next/server";

const ROOM_TYPES = ["living_room", "kitchen", "bedroom", "bathroom", "exterior", "other"];

/** Upload a photo to a draft job. Supports cookie (web) or Bearer token (mobile) so both stay in sync. */
export async function POST(
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

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, plan_tier")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job || job.status !== "draft") {
    return NextResponse.json({ error: "Job not found or not draft" }, { status: 404 });
  }

  const { count } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("job_id", jobId);

  const maxPhotos = getPlanConfig(job.plan_tier).maxPhotos;
  if ((count ?? 0) >= maxPhotos) {
    return NextResponse.json(
      {
        error: `This project allows up to ${maxPhotos} photos on ${getPlanConfig(job.plan_tier).name}. Remove a photo or upgrade to Pro.`,
      },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const roomType = formData.get("room_type") as string;
  const sequence = parseInt(String(formData.get("sequence") ?? "0"), 10);
  const file = formData.get("file") as File | null;
  const hasFile = file && typeof file.size === "number" && file.size > 0;
  console.info("[UploadPhoto]", { jobId, userId: user.id, hasFile, fileSize: file?.size ?? 0 });

  if (!ROOM_TYPES.includes(roomType)) {
    return NextResponse.json({ error: "Invalid room_type" }, { status: 400 });
  }
  if (!hasFile) {
    return NextResponse.json(
      { error: "No file received. If using the app, check your connection and try again." },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop() || "jpg";
  const key = `${user.id}/${jobId}/${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("wiselista-photos")
    .upload(key, file, { contentType: file.type, upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: photo, error: insertError } = await supabase
    .from("photos")
    .insert({
      job_id: jobId,
      room_type: roomType,
      sequence,
      original_key: key,
    })
    .select("id, room_type, sequence, original_key, created_at")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });
  console.info("[UploadPhoto] success", { jobId, photoId: photo?.id });
  return NextResponse.json(photo);
}
