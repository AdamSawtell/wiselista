/**
 * Server-side helpers for Supabase storage (wiselista-photos bucket).
 * Uses service role to create signed URLs for private objects.
 */

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

/**
 * Create signed URLs for original and edited keys so the user can view/download.
 * Returns null URLs if service client is unavailable or a key fails.
 */
export async function getSignedUrlsForPhotos(
  photos: PhotoKeys[],
  expiresInSeconds: number = DEFAULT_EXPIRES_IN
): Promise<PhotoSignedUrls[]> {
  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    return photos.map((p) => ({
      id: p.id,
      originalUrl: null,
      editedUrl: null,
    }));
  }

  const result: PhotoSignedUrls[] = [];

  for (const p of photos) {
    let originalUrl: string | null = null;
    let editedUrl: string | null = null;

    try {
      const { data: orig } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(p.original_key, expiresInSeconds);
      if (orig?.signedUrl) originalUrl = orig.signedUrl;
    } catch {
      // skip
    }

    if (p.edited_key) {
      try {
        const { data: edit } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(p.edited_key, expiresInSeconds);
        if (edit?.signedUrl) editedUrl = edit.signedUrl;
      } catch {
        // skip
      }
    }

    result.push({ id: p.id, originalUrl, editedUrl });
  }

  return result;
}
