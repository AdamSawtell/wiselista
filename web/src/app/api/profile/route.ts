import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import {
  type AgentProfileInput,
  profilePhotoStorageKey,
  sanitizeProfileInput,
  validateProfileInput,
} from "@/lib/profile";
import {
  enrichProfileWithPhotoUrl,
  isAllowedProfileImage,
  persistProfilePhotoUrl,
  profileImageExtension,
  signProfilePhotoUrl,
} from "@/lib/profile-photo";
import { NextResponse } from "next/server";

const BUCKET = "wiselista-photos";

const EMPTY_PROFILE = {
  profile_type: "agent" as const,
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
};

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    return NextResponse.json({ profile: { id: user.id, ...EMPTY_PROFILE } });
  }

  const profile = await enrichProfileWithPhotoUrl(supabase, data);
  if (
    profile?.photo_key &&
    profile.share_profile_photo_url &&
    profile.share_profile_photo_url !== data.share_profile_photo_url
  ) {
    await persistProfilePhotoUrl(supabase, user.id, profile.share_profile_photo_url);
  }

  return NextResponse.json({ profile });
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
    .select("photo_key, share_profile_photo_url")
    .eq("id", user.id)
    .maybeSingle();

  let photoKey: string | null = existing?.photo_key ?? null;
  let shareProfilePhotoUrl: string | null = existing?.share_profile_photo_url ?? null;

  if (input.profile_type === "agent" && photoKey) {
    shareProfilePhotoUrl = await signProfilePhotoUrl(supabase, photoKey, shareProfilePhotoUrl);
  } else if (input.profile_type === "individual" && photoKey) {
    await supabase.storage.from(BUCKET).remove([photoKey]);
    photoKey = null;
    shareProfilePhotoUrl = null;
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

  const profile = await enrichProfileWithPhotoUrl(supabase, data);
  return NextResponse.json({ profile });
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

  if (!isAllowedProfileImage(file)) {
    return NextResponse.json({ error: "Upload a JPG, PNG, or WebP image" }, { status: 400 });
  }

  const ext = profileImageExtension(file);
  const key = profilePhotoStorageKey(user.id, ext);
  const contentType = file.type || `image/${ext === "jpg" ? "jpeg" : ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, { contentType, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const shareProfilePhotoUrl = await signProfilePhotoUrl(supabase, key, null);

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        profile_type: existing?.profile_type ?? "agent",
        full_name: existing?.full_name ?? "",
        business_name: existing?.business_name ?? "",
        role_title: existing?.role_title ?? null,
        phone: existing?.phone ?? null,
        business_url: existing?.business_url ?? null,
        linkedin_url: existing?.linkedin_url ?? null,
        license_number: existing?.license_number ?? null,
        business_address: existing?.business_address ?? null,
        photo_key: key,
        share_profile_photo_url: shareProfilePhotoUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const profile = await enrichProfileWithPhotoUrl(supabase, data);
  if (!profile?.share_profile_photo_url) {
    return NextResponse.json(
      { error: "Photo uploaded but preview URL could not be created. Try refreshing the page." },
      { status: 500 }
    );
  }

  return NextResponse.json({ profile });
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
    .update({
      photo_key: null,
      share_profile_photo_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
