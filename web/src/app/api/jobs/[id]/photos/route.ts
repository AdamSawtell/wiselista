import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

const ROOM_TYPES = ["living_room", "kitchen", "bedroom", "bathroom", "exterior", "other"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job || job.status !== "draft") {
    return NextResponse.json({ error: "Job not found or not draft" }, { status: 404 });
  }

  const formData = await request.formData();
  const roomType = formData.get("room_type") as string;
  const sequence = parseInt(String(formData.get("sequence") ?? "0"), 10);
  const file = formData.get("file") as File | null;

  if (!ROOM_TYPES.includes(roomType)) {
    return NextResponse.json({ error: "Invalid room_type" }, { status: 400 });
  }
  if (!file || !file.size) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
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
  return NextResponse.json(photo);
}
