/**
 * Server-side helpers for Supabase storage (wiselista-photos bucket).
 * Prefer the signed-in user's session (works on Amplify without service role).
 * Falls back to service role when available (webhooks, admin).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";

const BUCKET = "wiselista-photos";
const DEFAULT_EXPIRES_IN = 3600; // 1 hour

export type PhotoKeys = {
  id: string;
  original_key: string;
  edited_key: string | null;
};

export type PhotoSignedUrls = {
  id: string;
  originalUrl: string | null;
  editedUrl: string | null;
};

function resolveStorageClient(
  userClient?: SupabaseClient | null
): SupabaseClient | null {
  if (userClient) return userClient;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;
  try {
    return createServiceClient();
  } catch {
    return null;
  }
}

async function signedUrlForKey(
  supabase: SupabaseClient,
  key: string,
  expiresInSeconds: number
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(key, expiresInSeconds);

  if (error) {
    console.error("[storage] createSignedUrl failed:", error.message, key);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Create signed URLs for original and edited keys so the user can view/download.
 * Pass the authenticated server Supabase client from createClient() when rendering
 * dashboard pages so previews work without SUPABASE_SERVICE_ROLE_KEY on Amplify.
 */
export async function getSignedUrlsForPhotos(
  photos: PhotoKeys[],
  userClient?: SupabaseClient | null,
  expiresInSeconds: number = DEFAULT_EXPIRES_IN
): Promise<PhotoSignedUrls[]> {
  const supabase = resolveStorageClient(userClient);
  if (!supabase) {
    console.error(
      "[storage] No Supabase client for signed URLs — pass user session or set SUPABASE_SERVICE_ROLE_KEY"
    );
    return photos.map((p) => ({
      id: p.id,
      originalUrl: null,
      editedUrl: null,
    }));
  }

  const result: PhotoSignedUrls[] = [];

  for (const p of photos) {
    const originalUrl = await signedUrlForKey(
      supabase,
      p.original_key,
      expiresInSeconds
    );

    let editedUrl: string | null = null;
    if (p.edited_key) {
      editedUrl = await signedUrlForKey(
        supabase,
        p.edited_key,
        expiresInSeconds
      );
    }

    result.push({ id: p.id, originalUrl, editedUrl });
  }

  return result;
}
