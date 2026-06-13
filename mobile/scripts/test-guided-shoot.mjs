/**
 * Integration test for guided shoot data flow (job create + photo upload).
 * Usage: node scripts/test-guided-shoot.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const GUIDED_SHOOT_SEQUENCE = ["living_room", "kitchen", "bedroom", "bathroom", "exterior"];

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPaths = [
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../web/.env.local"),
];

function loadEnv() {
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue;
    const env = {};
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) {
        const key = m[1].trim();
        const val = m[2].trim().replace(/^["']|["']$/g, "");
        env[key] = val;
        if (key === "NEXT_PUBLIC_SUPABASE_URL" && !env.EXPO_PUBLIC_SUPABASE_URL) {
          env.EXPO_PUBLIC_SUPABASE_URL = val;
        }
        if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY" && !env.EXPO_PUBLIC_SUPABASE_ANON_KEY) {
          env.EXPO_PUBLIC_SUPABASE_ANON_KEY = val;
        }
        if (key === "SUPABASE_SERVICE_ROLE_KEY" && !env.SUPABASE_SERVICE_ROLE_KEY) {
          env.SUPABASE_SERVICE_ROLE_KEY = val;
        }
      }
    }
    if (env.EXPO_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) return env;
  }
  return {};
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon) {
  console.error("FAIL: Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in mobile/.env");
  process.exit(1);
}

const auth = createClient(url, anon);
const { data: signIn, error } = await auth.auth.signInWithPassword({
  email: "adam@wiselista.com",
  password: "wiselista",
});
if (error || !signIn.user) {
  console.error("FAIL: Sign in", error?.message);
  process.exit(1);
}

const userId = signIn.user.id;
const admin = service ? createClient(url, service) : auth;

console.log("1. Create guided shoot job...");
const { data: job, error: jobErr } = await admin
  .from("jobs")
  .insert({ user_id: userId, status: "draft", name: "Mobile Guided Shoot Test" })
  .select("id")
  .single();
if (jobErr || !job) {
  console.error("FAIL: Create job", jobErr?.message);
  process.exit(1);
}
console.log("   Job:", job.id.slice(0, 8));

console.log("2. Clone photo for living room (simulates capture)...");
const { data: source } = await admin
  .from("photos")
  .select("original_key")
  .not("original_key", "is", null)
  .limit(1)
  .single();
if (!source) {
  console.error("FAIL: No source photo in DB");
  process.exit(1);
}

const roomType = GUIDED_SHOOT_SEQUENCE[0];
const { error: photoErr } = await admin.from("photos").insert({
  job_id: job.id,
  room_type: roomType,
  sequence: 1,
  original_key: source.original_key,
});
if (photoErr) {
  console.error("FAIL: Insert photo", photoErr.message);
  process.exit(1);
}

const { count } = await admin
  .from("photos")
  .select("id", { count: "exact", head: true })
  .eq("job_id", job.id);

console.log("3. Photos on job:", count);
if (count !== 1) {
  console.error("FAIL: Expected 1 photo");
  process.exit(1);
}

console.log("4. Cleanup test job...");
await admin.from("photos").delete().eq("job_id", job.id);
await admin.from("jobs").delete().eq("id", job.id);

console.log("OK: Guided shoot data flow works");
console.log("   Sequence starts with:", roomType);
