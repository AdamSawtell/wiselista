import {
  advanceCaptureStatus,
  getCaptureJobByToken,
  logCaptureEvent,
} from "@/lib/capture";
import { getPlanConfig } from "@/lib/plans";
import { getServiceClientOrNull } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const ROOM_TYPES = ["living_room", "kitchen", "bedroom", "bathroom", "exterior", "other"];
const BUCKET = "wiselista-photos";

/** Anonymous customer photo upload via capture magic link. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const service = getServiceClientOrNull();
  if (!service) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const job = await getCaptureJobByToken(service, token);
  if (!job) {
    return NextResponse.json({ error: "Capture link not found or expired" }, { status: 404 });
  }
  if (job.capture_status === "submitted") {
    return NextResponse.json({ error: "Photos already submitted to your agent" }, { status: 400 });
  }

  const formData = await request.formData();
  const roomType = String(formData.get("room_type") ?? "");
  const file = formData.get("file") as File | null;

  if (!ROOM_TYPES.includes(roomType)) {
    return NextResponse.json({ error: "Invalid room type" }, { status: 400 });
  }
  if (!file || !file.size) {
    return NextResponse.json({ error: "No photo received" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Upload a photo image" }, { status: 400 });
  }

  const { count } = await service
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id);

  const maxPhotos = getPlanConfig(job.plan_tier).maxPhotos;
  if ((count ?? 0) >= maxPhotos) {
    return NextResponse.json({ error: `This project allows up to ${maxPhotos} photos` }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const key = `${job.user_id}/${job.id}/${crypto.randomUUID()}.${ext === "jpeg" ? "jpg" : ext}`;

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(key, file, { contentType: file.type || "image/jpeg", upsert: false });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: existingPhotos } = await service
    .from("photos")
    .select("sequence")
    .eq("job_id", job.id)
    .order("sequence", { ascending: false })
    .limit(1);

  const sequence = (existingPhotos?.[0]?.sequence ?? -1) + 1;

  const { data: photo, error: insertError } = await service
    .from("photos")
    .insert({
      job_id: job.id,
      room_type: roomType,
      sequence,
      original_key: key,
    })
    .select("id, room_type, sequence")
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  await advanceCaptureStatus(service, job, "in_progress");
  await logCaptureEvent(service, job.id, "photo_uploaded", { room_type: roomType, photo_id: photo?.id });

  const { count: newCount } = await service
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id);

  return NextResponse.json({ photo, photoCount: newCount ?? 0, maxPhotos });
}
