import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { normalizePlanTier, type PlanTier } from "@/lib/plans";
import {
  captureExpiresAt,
  captureUrl,
  generateCaptureToken,
  logCaptureEvent,
} from "@/lib/capture";
import { defaultCaptureBrief, parseCaptureBrief, validateBriefForPlan } from "@/lib/capture-brief";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data, error } = await supabase
    .from("jobs")
    .select("id, status, name, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let name: string | null = null;
  let planTier: PlanTier = "core";
  let customerCapture = false;
  let captureBrief = defaultCaptureBrief();
  try {
    const body = await request.json();
    const trimmed = typeof body?.name === "string" ? body.name.trim() : "";
    if (trimmed.length > 120) {
      return NextResponse.json({ error: "Name must be 120 characters or fewer" }, { status: 400 });
    }
    name = trimmed || null;
    planTier = normalizePlanTier(typeof body?.plan_tier === "string" ? body.plan_tier : null);
    customerCapture = Boolean(body?.customer_capture);
    if (body?.capture_brief) {
      const parsed = parseCaptureBrief(body.capture_brief);
      if (parsed) captureBrief = parsed;
    }
  } catch {
    // no body — create unnamed project on default Core plan
  }

  const briefValidation = validateBriefForPlan(captureBrief, planTier);
  if (!briefValidation.ok) {
    return NextResponse.json({ error: briefValidation.error }, { status: 400 });
  }

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const captureEnabled = customerCapture && planTier === "pro";
  const captureToken = captureEnabled ? generateCaptureToken() : null;
  const captureExpires = captureEnabled ? captureExpiresAt() : null;

  const { data, error } = await supabase
    .from("jobs")
    .insert({
      user_id: user.id,
      status: "draft",
      name,
      plan_tier: planTier,
      capture_enabled: captureEnabled,
      capture_token: captureToken,
      capture_expires_at: captureExpires,
      capture_status: captureEnabled ? "link_sent" : "idle",
      capture_brief: captureBrief,
    })
    .select("id, status, name, plan_tier, capture_enabled, capture_token, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (captureEnabled && data?.id) {
    await logCaptureEvent(supabase, data.id, "link_created", { expires_at: captureExpires });
  }

  return NextResponse.json({
    ...data,
    capture_url: captureToken ? captureUrl(captureToken) : null,
  });
}
