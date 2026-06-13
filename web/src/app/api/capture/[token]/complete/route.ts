import {
  advanceCaptureStatus,
  getCaptureJobByToken,
  logCaptureEvent,
} from "@/lib/capture";
import { getServiceClientOrNull } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** Customer marks capture complete and sends photos to agent. */
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

  let customerName: string | null = null;
  try {
    const body = (await request.json()) as { customer_name?: string };
    customerName = body.customer_name?.trim() || null;
  } catch {
    // optional body
  }

  const { count } = await service
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("job_id", job.id);

  if (!count) {
    return NextResponse.json({ error: "Add at least one photo before sending to your agent" }, { status: 400 });
  }

  await service
    .from("jobs")
    .update({
      capture_status: "submitted",
      capture_submitted_at: new Date().toISOString(),
      capture_customer_name: customerName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  await logCaptureEvent(service, job.id, "submitted", {
    customer_name: customerName,
    photo_count: count,
  });

  return NextResponse.json({ ok: true, photoCount: count });
}

/** Track that customer opened the capture link. */
export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const service = getServiceClientOrNull();
  if (!service) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const job = await getCaptureJobByToken(service, token);
  if (!job) {
    return NextResponse.json({ error: "Capture link not found or expired" }, { status: 404 });
  }

  const next = job.capture_status === "link_sent" ? "viewed" : normalizeProgress(job.capture_status);
  await advanceCaptureStatus(service, job, next);
  await logCaptureEvent(service, job.id, "viewed");

  return NextResponse.json({ ok: true });
}

function normalizeProgress(status: string | null): "viewed" | "in_progress" {
  if (status === "in_progress" || status === "submitted") return "in_progress";
  return "viewed";
}
