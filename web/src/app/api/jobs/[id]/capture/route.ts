import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import {
  captureExpiresAt,
  captureUrl,
  generateCaptureToken,
  logCaptureEvent,
} from "@/lib/capture";
import { getPlanConfig } from "@/lib/plans";
import { isDefaultProjectName } from "@/lib/jobs";
import { NextResponse } from "next/server";

/** Enable customer capture and return magic link (Pro, draft only). */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status, plan_tier, capture_token, name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "draft") {
    return NextResponse.json({ error: "Customer capture is only available on draft projects" }, { status: 400 });
  }
  if (isDefaultProjectName(job.name, job.id)) {
    return NextResponse.json(
      { error: "Add a project name before creating a capture link — your customer will see it on their phone." },
      { status: 400 }
    );
  }
  if (!getPlanConfig(job.plan_tier).captureEnabled) {
    return NextResponse.json(
      { error: "Customer capture is a Wiselista Pro feature. Upgrade this project to Pro first." },
      { status: 403 }
    );
  }

  const token = job.capture_token ?? generateCaptureToken();
  const expiresAt = captureExpiresAt();

  const { data, error } = await supabase
    .from("jobs")
    .update({
      capture_enabled: true,
      capture_token: token,
      capture_expires_at: expiresAt,
      capture_status: "link_sent",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "capture_token, capture_expires_at, capture_status, capture_viewed_at, capture_started_at, capture_submitted_at, capture_customer_name"
    )
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await logCaptureEvent(supabase, id, "link_created", { expires_at: expiresAt });

  return NextResponse.json({
    url: captureUrl(token),
    ...data,
  });
}

/** Get capture status and recent events for agent dashboard. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { data: job } = await supabase
    .from("jobs")
    .select(
      "name, property_address, capture_enabled, capture_token, capture_expires_at, capture_status, capture_viewed_at, capture_started_at, capture_submitted_at, capture_customer_name, plan_tier, status"
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, business_name")
    .eq("id", user.id)
    .maybeSingle();

  const { data: events } = await supabase
    .from("capture_events")
    .select("id, event_type, metadata, created_at")
    .eq("job_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  const { count: photoCount } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("job_id", id);

  return NextResponse.json({
    ...job,
    url: job.capture_token ? captureUrl(job.capture_token) : null,
    photoCount: photoCount ?? 0,
    events: events ?? [],
    agentName: profile?.full_name?.trim() || null,
    agentAgency: profile?.business_name?.trim() || null,
  });
}

/** Disable / revoke customer capture link. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Service unavailable" }, { status: 503 });

  const { error } = await supabase
    .from("jobs")
    .update({
      capture_enabled: false,
      capture_token: null,
      capture_expires_at: null,
      capture_status: "idle",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await logCaptureEvent(supabase, id, "link_revoked");
  return NextResponse.json({ ok: true });
}
