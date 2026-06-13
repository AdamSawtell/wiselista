import { LISTING_TYPE_LABELS, type ListingType } from "@/lib/enhancement";
import { getJobDisplayName, ROOM_LABELS } from "@/lib/jobs";
import { getServiceClientOrNull } from "@/lib/supabase/server";

const BUCKET = "wiselista-photos";
const SIGNED_EXPIRY = 3600;

export type SharePhoto = {
  id: string;
  roomType: string;
  roomLabel: string;
  sequence: number;
  imageUrl: string;
};

export type SharePageData = {
  propertyName: string;
  propertyAddress: string | null;
  listingTypeLabel: string | null;
  agentName: string;
  agentEmail: string | null;
  completedAt: string | null;
  photos: SharePhoto[];
};

function agentDisplayName(
  email: string | null | undefined,
  metadata: Record<string, unknown> | undefined
): string {
  const fullName = metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  if (email) {
    const local = email.split("@")[0]?.replace(/[._]/g, " ").trim();
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return "Your agent";
}

/** Load public share page data by token (service role required). */
export async function getSharePageData(token: string): Promise<SharePageData | null> {
  const supabase = getServiceClientOrNull();
  if (!supabase) return null;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, name, status, property_address, listing_type, user_id, completed_at")
    .eq("share_token", token)
    .single();

  if (!job || job.status !== "ready") return null;

  let agentName = "Your agent";
  let agentEmail: string | null = null;
  if (job.user_id) {
    const { data: authData } = await supabase.auth.admin.getUserById(job.user_id);
    if (authData?.user) {
      agentEmail = authData.user.email ?? null;
      agentName = agentDisplayName(
        agentEmail,
        authData.user.user_metadata as Record<string, unknown> | undefined
      );
    }
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id, room_type, sequence, edited_key, original_key")
    .eq("job_id", job.id)
    .not("edited_key", "is", null)
    .order("sequence");

  const signedPhotos = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const key = photo.edited_key ?? photo.original_key;
      const { data } = await supabase.storage.from(BUCKET).createSignedUrl(key, SIGNED_EXPIRY);
      return {
        id: photo.id,
        roomType: photo.room_type,
        roomLabel: ROOM_LABELS[photo.room_type] ?? photo.room_type,
        sequence: photo.sequence,
        imageUrl: data?.signedUrl ?? "",
      };
    })
  );

  const listingType = job.listing_type as ListingType | null;

  return {
    propertyName: getJobDisplayName(job),
    propertyAddress: job.property_address ?? null,
    listingTypeLabel: listingType ? LISTING_TYPE_LABELS[listingType] : null,
    agentName,
    agentEmail,
    completedAt: job.completed_at ?? null,
    photos: signedPhotos.filter((p) => p.imageUrl),
  };
}
