import { randomBytes } from "crypto";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  type CaptureSession,
  type CaptureStatus,
  type CaptureBriefSlotView,
  normalizeCaptureStatus,
} from "@/lib/capture-shared";
import { getPlanConfig } from "@/lib/plans";
import { getServiceClientOrNull } from "@/lib/supabase/server";
import {
  orderedSlots,
  parseCaptureBrief,
  requiredSlotCount,
  resolveCaptureBrief,
} from "@/lib/capture-brief";

export {
  CAPTURE_LINK_TTL_DAYS,
  CAPTURE_STATUS_LABELS,
  CAPTURE_TIPS,
  GUIDED_CAPTURE_SEQUENCE,
  normalizeCaptureStatus,
  roomLabel,
  type CaptureSession,
  type CaptureStatus,
} from "@/lib/capture-shared";

type RpcCapturePayload = {
  job_id: string;
  property_name: string | null;
  property_address: string | null;
  plan_tier: string | null;
  capture_status: string | null;
  photo_count: number;
  max_photos: number;
  agent_profile: {
    full_name?: string;
    business_name?: string;
  } | null;
  already_submitted: boolean;
  capture_brief?: unknown;
  filled_slot_ids?: string[] | null;
};

function briefSlotsFromPayload(briefRaw: unknown): CaptureBriefSlotView[] {
  const brief = resolveCaptureBrief(briefRaw);
  return orderedSlots(brief).map((s) => ({
    id: s.id,
    label: s.label,
    room_type: s.room_type,
    required: s.required,
    sequence: s.sequence,
  }));
}

function payloadToSession(data: RpcCapturePayload): CaptureSession {
  const brief = parseCaptureBrief(data.capture_brief) ?? resolveCaptureBrief(null);
  const slots = briefSlotsFromPayload(data.capture_brief);
  const filledSlotIds = Array.isArray(data.filled_slot_ids)
    ? data.filled_slot_ids.filter((id): id is string => typeof id === "string")
    : [];

  return {
    jobId: data.job_id,
    propertyName: data.property_name?.trim() || "Property photos",
    propertyAddress: data.property_address ?? null,
    planTier: data.plan_tier ?? "pro",
    captureStatus: normalizeCaptureStatus(data.capture_status),
    photoCount: data.photo_count ?? 0,
    maxPhotos: data.max_photos ?? getPlanConfig(data.plan_tier).maxPhotos,
    agentName: data.agent_profile?.full_name?.trim() || "Your agent",
    agentAgency: data.agent_profile?.business_name?.trim() || null,
    alreadySubmitted: Boolean(data.already_submitted),
    slots,
    filledSlotIds,
    requiredSlotCount: requiredSlotCount(brief),
  };
}
export function generateCaptureToken(): string {
  return randomBytes(24).toString("hex");
}

export function captureExpiresAt(from = new Date()): string {
  const expires = new Date(from);
  expires.setDate(expires.getDate() + 14);
  return expires.toISOString();
}

export function captureUrl(token: string): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${appUrl}/capture/${token}`;
}

export async function loadCaptureSession(token: string): Promise<CaptureSession | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey);
  const { data, error } = await supabase.rpc("get_capture_session", { p_token: token });
  if (error || !data) return null;
  return payloadToSession(data as RpcCapturePayload);
}

export type CaptureJobRow = {
  id: string;
  user_id: string;
  status: string;
  plan_tier: string | null;
  capture_enabled: boolean;
  capture_token: string | null;
  capture_expires_at: string | null;
  capture_status: string | null;
  capture_viewed_at: string | null;
  capture_started_at: string | null;
  capture_submitted_at: string | null;
  capture_customer_name: string | null;
};

export async function getCaptureJobByToken(
  service: SupabaseClient,
  token: string
): Promise<CaptureJobRow | null> {
  const { data } = await service
    .from("jobs")
    .select(
      "id, user_id, status, plan_tier, capture_enabled, capture_token, capture_expires_at, capture_status, capture_viewed_at, capture_started_at, capture_submitted_at, capture_customer_name"
    )
    .eq("capture_token", token)
    .eq("capture_enabled", true)
    .eq("status", "draft")
    .maybeSingle();

  if (!data) return null;
  if (data.capture_expires_at && new Date(data.capture_expires_at) < new Date()) return null;
  return data as CaptureJobRow;
}

export async function logCaptureEvent(
  serviceOrUserClient: SupabaseClient,
  jobId: string,
  eventType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const service = getServiceClientOrNull() ?? serviceOrUserClient;
  await service.from("capture_events").insert({
    job_id: jobId,
    event_type: eventType,
    metadata: metadata ?? null,
  });
}

export async function advanceCaptureStatus(
  service: SupabaseClient,
  job: CaptureJobRow,
  next: CaptureStatus,
  extra?: Record<string, string | null>
): Promise<void> {
  const rank: CaptureStatus[] = ["idle", "link_sent", "viewed", "in_progress", "submitted"];
  const current = normalizeCaptureStatus(job.capture_status);
  if (rank.indexOf(next) <= rank.indexOf(current) && next !== "in_progress") return;

  const patch: Record<string, string | null> = {
    capture_status: next,
    updated_at: new Date().toISOString(),
    ...extra,
  };

  if (next === "viewed" && !job.capture_viewed_at) {
    patch.capture_viewed_at = new Date().toISOString();
  }
  if (next === "in_progress" && !job.capture_started_at) {
    patch.capture_started_at = new Date().toISOString();
  }
  if (next === "submitted") {
    patch.capture_submitted_at = new Date().toISOString();
  }

  await service.from("jobs").update(patch).eq("id", job.id);
}

export function isCaptureEnabledForPlan(planTier: string | null | undefined): boolean {
  return getPlanConfig(planTier).captureEnabled;
}
