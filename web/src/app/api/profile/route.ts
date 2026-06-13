import { createClientForRequest, getServiceClientOrNull } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import {
  type AgentProfileInput,
  PROFILE_PHOTO_SIGNED_EXPIRY,
  profilePhotoStorageKey,
  sanitizeProfileInput,
  validateProfileInput,
} from "@/lib/profile";
import { NextResponse } from "next/server";

const BUCKET = "wiselista-photos";

async function signProfilePhotoUrl(photoKey: string): Promise<string | null> {
  const service = getServiceClientOrNull();
  if (!service) return null;
  const { data, error } = await service.storage
    .from(BUCKET)
    .createSignedUrl(photoKey, PROFILE_PHOTO_SIGNED_EXPIRY);
  if (error) {
    console.error("[profile] createSignedUrl failed:", error.message, photoKey);
    return null;
  }
  return data?.signedUrl ?? null;
}

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    return NextResponse.json({
      profile: {
        id: user.id,
        profile_type: "agent",
        full_name: "",
        business_name: "",
        role_title: null,
        phone: null,
        business_url: null,
        linkedin_url: null,
        license_number: null,
        business_address: null,
        photo_key: null,
        share_profile_photo_url: null,
      },
    });
  }

  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  let body: AgentProfileInput;
  try {
    body = (await request.json()) as AgentProfileInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = sanitizeProfileInput(body);
  const validationError = validateProfileInput(body);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { data: existing } = await supabase
    .from("profiles")
    .select("photo_key")
    .eq("id", user.id)
    .maybeSingle();

  let photoKey: string | null = existing?.photo_key ?? null;
  let shareProfilePhotoUrl: string | null = null;

  if (input.profile_type === "agent" && photoKey) {
    shareProfilePhotoUrl = await signProfilePhotoUrl(photoKey);
  } else if (input.profile_type === "individual" && photoKey) {
    await supabase.storage.from(BUCKET).remove([photoKey]);
    photoKey = null;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        ...input,
        share_profile_photo_url: shareProfilePhotoUrl,
        photo_key: photoKey,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

/** Upload or replace agent profile photo. */
export async function POST(request: Request) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const hasFile = file && typeof file.size === "number" && file.size > 0;
  if (!hasFile) {
    return NextResponse.json({ error: "No file received" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Upload a JPG or PNG image" }, { status: 400 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  if (!["jpg", "jpeg", "png", "webp"].includes(ext)) {
    return NextResponse.json({ error: "Use JPG, PNG, or WebP" }, { status: 400 });
  }

  const key = profilePhotoStorageKey(user.id, ext === "jpeg" ? "jpg" : ext);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const shareProfilePhotoUrl = await signProfilePhotoUrl(key);

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        photo_key: key,
        share_profile_photo_url: shareProfilePhotoUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}

/** Remove agent profile photo. */
export async function DELETE(request: Request) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: existing } = await supabase
    .from("profiles")
    .select("photo_key")
    .eq("id", user.id)
    .maybeSingle();

  if (existing?.photo_key) {
    await supabase.storage.from(BUCKET).remove([existing.photo_key]);
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        photo_key: null,
        share_profile_photo_url: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
