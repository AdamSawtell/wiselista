/**
 * Backfill share_photo_urls for a ready job (uses service role).
 * Usage: node scripts/refresh-share-urls.mjs [jobId]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const jobId = process.argv[2] ?? "5c252165-4a31-409f-a789-d09b60eed9ca";

function loadEnv() {
  const envPath = resolve(__dirname, "../.env.local");
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !service) {
  console.error("FAIL: need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(url, service);
const TTL = 60 * 60 * 24 * 7;

const { data: photos, error: photosErr } = await sb
  .from("photos")
  .select("id, original_key, edited_key")
  .eq("job_id", jobId)
  .not("edited_key", "is", null)
  .order("sequence");

if (photosErr) {
  console.error("FAIL photos:", photosErr.message);
  process.exit(1);
}

const sharePhotoUrls = {};
for (const p of photos ?? []) {
  const key = p.edited_key ?? p.original_key;
  const { data, error } = await sb.storage.from("wiselista-photos").createSignedUrl(key, TTL);
  if (error) {
    console.error("sign failed", p.id, error.message);
    continue;
  }
  if (data?.signedUrl) sharePhotoUrls[p.id] = data.signedUrl;
}

const { error: updateErr } = await sb
  .from("jobs")
  .update({ share_photo_urls: sharePhotoUrls, updated_at: new Date().toISOString() })
  .eq("id", jobId);

if (updateErr) {
  console.error("FAIL update:", updateErr.message);
  console.error("Run supabase/migrations/20250613130000_share_photo_urls.sql in SQL Editor first.");
  process.exit(1);
}

console.log("OK: refreshed", Object.keys(sharePhotoUrls).length, "photo URLs for job", jobId);
