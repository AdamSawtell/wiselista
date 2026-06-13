import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient, createClientForRequest, getServiceClientOrNull } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { getCurrentUser } from "@/lib/auth";
import { canDowngradeToCore, getPlanConfig, normalizePlanTier } from "@/lib/plans";
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

/** Update job metadata (name, property context). User must own the job. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  let body: {
    name?: string;
    property_address?: string | null;
    listing_type?: string | null;
    target_portal?: string | null;
    plan_tier?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updates: Record<string, string | null> = { updated_at: new Date().toISOString() };

  if (body.name !== undefined) {
    const trimmed = typeof body.name === "string" ? body.name.trim() : "";
    if (trimmed.length > 120) {
      return NextResponse.json({ error: "Name must be 120 characters or fewer" }, { status: 400 });
    }
    updates.name = trimmed || null;
  }

  if (body.property_address !== undefined) {
    const addr = typeof body.property_address === "string" ? body.property_address.trim() : "";
    if (addr.length > 200) {
      return NextResponse.json({ error: "Address must be 200 characters or fewer" }, { status: 400 });
    }
    updates.property_address = addr || null;
  }

  if (body.listing_type !== undefined) {
    const lt = body.listing_type;
    if (lt !== null && lt !== "rent" && lt !== "sale" && lt !== "") {
      return NextResponse.json({ error: "listing_type must be rent or sale" }, { status: 400 });
    }
    updates.listing_type = lt === "" || lt === null ? null : lt;
  }

  if (body.target_portal !== undefined) {
    const portal = typeof body.target_portal === "string" ? body.target_portal.trim() : "";
    updates.target_portal = portal || null;
  }

  if (body.plan_tier !== undefined) {
    const nextTier = normalizePlanTier(body.plan_tier);
    const supabaseCheck = await createClientForRequest(request);
    if (!supabaseCheck) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

    const { data: job } = await supabaseCheck
      .from("jobs")
      .select("id, status")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (job.status !== "draft") {
      return NextResponse.json({ error: "Plan can only be changed while the project is a draft" }, { status: 400 });
    }

    if (nextTier === "core") {
      const { count } = await supabaseCheck
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("job_id", id);
      if (!canDowngradeToCore(count ?? 0)) {
        return NextResponse.json(
          {
            error: `Core allows up to ${getPlanConfig("core").maxPhotos} photos. Remove extras before switching plans.`,
          },
          { status: 400 }
        );
      }
    }

    updates.plan_tier = nextTier;
  }

  if (Object.keys(updates).length === 1) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data, error } = await supabase
    .from("jobs")
    .update(updates)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, name, property_address, listing_type, target_portal, plan_tier, status, created_at, updated_at")
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
