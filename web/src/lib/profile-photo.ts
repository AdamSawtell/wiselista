import type { SupabaseClient } from "@supabase/supabase-js";
import { PROFILE_PHOTO_SIGNED_EXPIRY } from "@/lib/profile";
import { getServiceClientOrNull } from "@/lib/supabase/server";

const BUCKET = "wiselista-photos";

/** Sign a profile photo URL using the user session, then service role as fallback. */
export async function signProfilePhotoUrl(
  supabase: SupabaseClient | null,
  photoKey: string,
  fallbackUrl?: string | null
): Promise<string | null> {
  if (supabase) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(photoKey, PROFILE_PHOTO_SIGNED_EXPIRY);
    if (!error && data?.signedUrl) return data.signedUrl;
    console.error("[profile-photo] user sign failed:", error?.message, photoKey);
  }

  const service = getServiceClientOrNull();
  if (service) {
    const { data, error } = await service.storage
      .from(BUCKET)
      .createSignedUrl(photoKey, PROFILE_PHOTO_SIGNED_EXPIRY);
    if (!error && data?.signedUrl) return data.signedUrl;
    console.error("[profile-photo] service sign failed:", error?.message, photoKey);
  }

  return fallbackUrl?.trim() || null;
}

type ProfileWithPhoto = {
  photo_key?: string | null;
  share_profile_photo_url?: string | null;
};

export async function enrichProfileWithPhotoUrl<T extends ProfileWithPhoto>(
  supabase: SupabaseClient | null,
  profile: T | null | undefined
): Promise<T | null> {
  if (!profile) return null;
  if (!profile.photo_key) {
    return { ...profile, share_profile_photo_url: null };
  }

  const signedUrl = await signProfilePhotoUrl(
    supabase,
    profile.photo_key,
    profile.share_profile_photo_url
  );
  return { ...profile, share_profile_photo_url: signedUrl };
}

export async function persistProfilePhotoUrl(
  supabase: SupabaseClient,
  userId: string,
  signedUrl: string | null
): Promise<void> {
  if (!signedUrl) return;
  const { error } = await supabase
    .from("profiles")
    .update({ share_profile_photo_url: signedUrl, updated_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) {
    console.error("[profile-photo] persist url failed:", error.message);
  }
}

export function isAllowedProfileImage(file: File): boolean {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const allowedExt = ["jpg", "jpeg", "png", "webp"];
  if (!allowedExt.includes(ext)) return false;
  if (!file.type) return true;
  return file.type.startsWith("image/");
}

export function profileImageExtension(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return ext === "jpeg" ? "jpg" : ext;
}
