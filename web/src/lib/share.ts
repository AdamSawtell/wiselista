import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
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
  photos: RpcPhoto[];
};

function agentDisplayName(
  email: string | null | undefined,
  metadata: Record<string, unknown> | null | undefined
): string {
  const fullName = metadata?.full_name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  if (email) {
    const local = email.split("@")[0]?.replace(/[._]/g, " ").trim();
    if (local) return local.charAt(0).toUpperCase() + local.slice(1);
  }
  return "Your agent";
}

function createAnonClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createSupabaseClient(supabaseUrl, supabaseAnonKey);
}

async function signPhotoUrls(
  supabase: SupabaseClient,
  photos: RpcPhoto[]
): Promise<SharePhoto[]> {
  const signed = await Promise.all(
    photos.map(async (photo) => {
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
  return signed.filter((p) => p.imageUrl);
}

async function getSharePageDataViaRpc(token: string): Promise<SharePageData | null> {
  const supabase = createAnonClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("get_public_share", { p_token: token });
  if (error) {
    console.error("[share] RPC get_public_share failed:", error.message);
    return null;
  }
  if (!data) return null;

  const payload = data as RpcSharePayload;
  const listingType = payload.listing_type as ListingType | null;
  const photos = Array.isArray(payload.photos) ? payload.photos : [];

  return {
    propertyName: getJobDisplayName({
      id: payload.job_id,
      name: payload.property_name,
    }),
    propertyAddress: payload.property_address ?? null,
    listingTypeLabel: listingType ? LISTING_TYPE_LABELS[listingType] : null,
    agentName: agentDisplayName(payload.agent_email, payload.agent_meta ?? undefined),
    agentEmail: payload.agent_email ?? null,
    completedAt: payload.completed_at ?? null,
    photos: await signPhotoUrls(supabase, photos),
  };
}

async function getSharePageDataViaService(token: string): Promise<SharePageData | null> {
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

  const rpcPhotos: RpcPhoto[] = (photos ?? []).map((p) => ({
    id: p.id,
    room_type: p.room_type,
    sequence: p.sequence,
    edited_key: p.edited_key,
    original_key: p.original_key,
  }));

  const listingType = job.listing_type as ListingType | null;

  return {
    propertyName: getJobDisplayName(job),
    propertyAddress: job.property_address ?? null,
    listingTypeLabel: listingType ? LISTING_TYPE_LABELS[listingType] : null,
    agentName,
    agentEmail,
    completedAt: job.completed_at ?? null,
    photos: await signPhotoUrls(supabase, rpcPhotos),
  };
}

/** Load public share page data by token (RPC + anon key, or service role). */
export async function getSharePageData(token: string): Promise<SharePageData | null> {
  const viaService = await getSharePageDataViaService(token);
  if (viaService) return viaService;
  return getSharePageDataViaRpc(token);
}
