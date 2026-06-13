/**
 * Debug share link photo signing for a token.
 * Usage: node scripts/test-share-link.mjs [token]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const token =
  process.argv[2] ?? "1a8418f7e073945891c8f81c4a188c5435a83375a7360fc3";

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
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon) {
  console.error("FAIL: need NEXT_PUBLIC_SUPABASE_URL and anon key in .env.local");
  process.exit(1);
}

const anonClient = createClient(url, anon);
const serviceClient = service ? createClient(url, service) : null;

console.log("Token:", token);

for (const label of ["service", "anon"]) {
  const client = label === "service" ? serviceClient : anonClient;
  if (!client) {
    console.log(`\n[${label}] skipped (no service key)`);
    continue;
  }

  const { data, error } = await client.rpc("get_public_share", { p_token: token });
  console.log(`\n[${label}] RPC:`, error?.message ?? "ok");
  if (!data) {
    console.log(`[${label}] no data`);
    continue;
  }
  const photos = data.photos ?? [];
  console.log(`[${label}] job:`, data.property_name, "photos:", photos.length);

  for (const p of photos) {
    const key = p.edited_key ?? p.original_key;
    const { data: signed, error: signErr } = await client.storage
      .from("wiselista-photos")
      .createSignedUrl(key, 3600);
    console.log(`  ${p.room_type} key=${key}`);
    console.log(`    sign:`, signErr?.message ?? (signed?.signedUrl ? "OK" : "no url"));
  }
}

// Direct job lookup via service
if (serviceClient) {
  const { data: job } = await serviceClient
    .from("jobs")
    .select("id, name, share_token, status")
    .eq("share_token", token)
    .single();
  console.log("\n[job]", job);
}
