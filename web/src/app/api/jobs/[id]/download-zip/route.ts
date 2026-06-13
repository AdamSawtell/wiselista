import JSZip from "jszip";
import { createClientForRequest, createServiceClient } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { listingFilename } from "@/lib/enhancement";
import { getJobDisplayName } from "@/lib/jobs";
import { NextResponse } from "next/server";

const BUCKET = "wiselista-photos";

/** Download all edited photos as a ZIP with listing-friendly filenames. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job } = await supabase
    .from("jobs")
    .select("id, name, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "ready") {
    return NextResponse.json({ error: "ZIP export is available when photos are ready" }, { status: 400 });
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id, room_type, sequence, edited_key")
    .eq("job_id", jobId)
    .not("edited_key", "is", null)
    .order("sequence");

  if (!photos?.length) {
    return NextResponse.json({ error: "No edited photos to export" }, { status: 400 });
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return NextResponse.json({ error: "Server storage not configured" }, { status: 503 });
  }

  const zip = new JSZip();
  for (const photo of photos) {
    const { data: blob, error } = await service.storage.from(BUCKET).download(photo.edited_key!);
    if (error || !blob) continue;
    const buffer = await blob.arrayBuffer();
    zip.file(listingFilename(photo.sequence, photo.room_type), buffer);
  }

  const zipBuffer = await zip.generateAsync({ type: "arraybuffer" });
  const slug = getJobDisplayName(job).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "wiselista";
  const filename = `${slug || "wiselista"}-photos.zip`;

  return new NextResponse(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
