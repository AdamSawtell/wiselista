/**
 * Quick Claid API smoke test using one real photo from Supabase.
 * Usage: node scripts/test-claid.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function loadEnv() {
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
const claidKey = env.CLAID_API_KEY;

if (!url || !service || !claidKey) {
  console.error("FAIL: Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CLAID_API_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, service);

const { data: photo } = await supabase
  .from("photos")
  .select("id, original_key, room_type")
  .not("original_key", "is", null)
  .limit(1)
  .single();

if (!photo) {
  console.error("FAIL: No photos in database to test with");
  process.exit(1);
}

const { data: signed } = await supabase.storage
  .from("wiselista-photos")
  .createSignedUrl(photo.original_key, 3600);

if (!signed?.signedUrl) {
  console.error("FAIL: Could not sign photo URL");
  process.exit(1);
}

console.log(`Testing Claid with photo ${photo.id.slice(0, 8)} (${photo.room_type})...`);

const operations = {
  restorations: { upscale: "smart_enhance", decompress: "auto", polish: false },
  resizing: { fit: "bounds", width: "150%", height: "150%" },
  adjustments: {
    hdr: { intensity: 100, stitching: false },
    exposure: 10,
    saturation: 10,
    contrast: 10,
    sharpness: 12,
  },
};

const res = await fetch("https://api.claid.ai/v1/image/edit", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${claidKey}`,
  },
  body: JSON.stringify({
    input: signed.signedUrl,
    operations,
    output: { format: { type: "jpeg", quality: 88 } },
  }),
});

const body = await res.json().catch(() => ({}));

if (!res.ok) {
  console.error("FAIL: Claid API", res.status, body.message ?? JSON.stringify(body));
  process.exit(1);
}

const tmpUrl = body?.data?.output?.tmp_url;
if (!tmpUrl) {
  console.error("FAIL: No tmp_url in response", JSON.stringify(body));
  process.exit(1);
}

console.log("OK: Claid returned enhanced image URL");
console.log("Preview (expires soon):", tmpUrl.slice(0, 80) + "...");
