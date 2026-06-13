import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { LISTING_TYPE_LABELS, type ListingType } from "@/lib/enhancement";
import { getJobDisplayName, ROOM_LABELS } from "@/lib/jobs";
import {
  type AgentProfile,
  shareAgentFromPayload,
  type ShareAgentInfo,
} from "@/lib/profile";
import { signProfilePhotoUrl } from "@/lib/profile-photo";
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
  agent: ShareAgentInfo;
  completedAt: string | null;
  photos: SharePhoto[];
};

type RpcPhoto = {
  id: string;
  room_type: string;
  sequence: number;
  edited_key: string | null;
  original_key: string;
};

type RpcSharePayload = {
  job_id: string;
  property_name: string | null;
  property_address: string | null;
  listing_type: string | null;
  completed_at: string | null;
  agent_email: string | null;
  agent_meta: Record<string, unknown> | null;
  agent_profile?: Partial<AgentProfile> | null;
  share_photo_urls?: Record<string, string> | null;
  photos: RpcPhoto[];
};

function photosFromCachedUrls(payload: RpcSharePayload): SharePhoto[] {
  const raw = Array.isArray(payload.photos) ? payload.photos : [];
  const cached = payload.share_photo_urls;
  if (!cached || typeof cached !== "object") return [];

  return raw
    .map((photo) => ({
      id: photo.id,
      roomType: photo.room_type,
      roomLabel: ROOM_LABELS[photo.room_type] ?? photo.room_type,
      sequence: photo.sequence,
      imageUrl: cached[photo.id] ?? "",
    }))
    .filter((p) => p.imageUrl);
}

function createAnonClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

/** Signed URLs must use service role — anon storage policy is not reliable for createSignedUrl. */
function signingClient(): SupabaseClient | null {
  return getServiceClientOrNull();
}

async function signPhotoUrls(photos: RpcPhoto[]): Promise<SharePhoto[]> {
  const supabase = signingClient();
  if (!supabase) {
    console.error("[share] SUPABASE_SERVICE_ROLE_KEY missing — cannot sign photo URLs");
    return [];
  }

  const signed = await Promise.all(
    photos.map(async (photo) => {
      const key = photo.edited_key ?? photo.original_key;
      const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, SIGNED_EXPIRY);
      if (error) {
        console.error("[share] createSignedUrl failed:", error.message, key);
      }
      return {
        id: photo.id,
        roomType: photo.room_type,
        roomLabel: ROOM_LABELS[photo.room_type] ?? photo.room_type,
        sequence: photo.sequence,
        imageUrl: data?.signedUrl ?? "",
      };
    })
  );
  return signed.filter((p) => p.imageUrl);
}

async function loadSharePayloadViaRpc(token: string): Promise<RpcSharePayload | null> {
  const supabase = createAnonClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_public_share", { p_token: token });
  if (error) {
    console.error("[share] RPC get_public_share failed:", error.message);
    return null;
  }
  if (!data) return null;
  return data as RpcSharePayload;
}

async function loadSharePayloadViaService(token: string): Promise<RpcSharePayload | null> {
  const supabase = getServiceClientOrNull();
  if (!supabase) return null;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, name, status, property_address, listing_type, user_id, completed_at, share_photo_urls")
    .eq("share_token", token)
    .single();

  if (!job || job.status !== "ready") return null;

  let agentEmail: string | null = null;
  let agentMeta: Record<string, unknown> | null = null;
  let agentProfile: Partial<AgentProfile> | null = null;
  if (job.user_id) {
    const { data: authData } = await supabase.auth.admin.getUserById(job.user_id);
    if (authData?.user) {
      agentEmail = authData.user.email ?? null;
      agentMeta = (authData.user.user_metadata as Record<string, unknown>) ?? null;
    }
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", job.user_id).maybeSingle();
    agentProfile = profile ?? null;
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id, room_type, sequence, edited_key, original_key")
    .eq("job_id", job.id)
    .not("edited_key", "is", null)
    .order("sequence");

  return {
    job_id: job.id,
    property_name: job.name,
    property_address: job.property_address ?? null,
    listing_type: job.listing_type ?? null,
    completed_at: job.completed_at ?? null,
    agent_email: agentEmail,
    agent_meta: agentMeta,
    agent_profile: agentProfile,
    share_photo_urls: (job.share_photo_urls as Record<string, string> | null) ?? null,
    photos: (photos ?? []).map((p) => ({
      id: p.id,
      room_type: p.room_type,
      sequence: p.sequence,
      edited_key: p.edited_key,
      original_key: p.original_key,
    })),
  };
}

async function resolveProfilePhotoUrl(
  profile: Partial<AgentProfile> | null | undefined
): Promise<Partial<AgentProfile> | null | undefined> {
  if (!profile?.photo_key) return profile;

  const signedUrl = await signProfilePhotoUrl(
    signingClient(),
    profile.photo_key,
    profile.share_profile_photo_url
  );
  if (!signedUrl) return profile;

  return { ...profile, share_profile_photo_url: signedUrl };
}

async function payloadToSharePageData(
  payload: RpcSharePayload,
  photos: SharePhoto[]
): Promise<SharePageData> {
  const listingType = payload.listing_type as ListingType | null;
  const profile = await resolveProfilePhotoUrl(payload.agent_profile ?? undefined);
  return {
    propertyName: getJobDisplayName({
      id: payload.job_id,
      name: payload.property_name,
    }),
    propertyAddress: payload.property_address ?? null,
    listingTypeLabel: listingType ? LISTING_TYPE_LABELS[listingType] : null,
    agent: shareAgentFromPayload(
      payload.agent_email,
      payload.agent_meta ?? undefined,
      profile ?? undefined
    ),
    completedAt: payload.completed_at ?? null,
    photos,
  };
}

/** Load public share page data by token. */
export async function getSharePageData(token: string): Promise<SharePageData | null> {
  const payload =
    (await loadSharePayloadViaService(token)) ?? (await loadSharePayloadViaRpc(token));
  if (!payload) return null;

  const photos = Array.isArray(payload.photos) ? payload.photos : [];
  const cachedPhotos = photosFromCachedUrls(payload);
  const signedPhotos =
    cachedPhotos.length > 0 ? cachedPhotos : await signPhotoUrls(photos);
  return await payloadToSharePageData(payload, signedPhotos);
}
