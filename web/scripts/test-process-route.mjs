/**
 * Test the dashboard /process route on production (simulates Stripe webhook + agent page).
 * Usage: TEST_BASE_URL=https://wiselista.com node scripts/test-process-route.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const baseUrl = (process.env.TEST_BASE_URL ?? "https://wiselista.com").replace(/\/$/, "");

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

if (!url || !anon || !service) {
  console.error("FAIL: Need Supabase env in .env.local");
  process.exit(1);
}

const auth = createClient(url, anon);
const admin = createClient(url, service);

const { data: signIn, error: signInError } = await auth.auth.signInWithPassword({
  email: "adam@wiselista.com",
  password: "wiselista",
});

if (signInError || !signIn.session) {
  console.error("FAIL: Sign in failed", signInError?.message);
  process.exit(1);
}

const token = signIn.session.access_token;
const userId = signIn.user.id;

console.log("1. Creating draft job...");
const { data: newJob, error: jobError } = await admin
  .from("jobs")
  .insert({ user_id: userId, status: "draft", name: "Process route E2E", plan_tier: "core" })
  .select("id")
  .single();

if (jobError || !newJob) {
  console.error("FAIL: Create job", jobError?.message);
  process.exit(1);
}
const jobId = newJob.id;
console.log("   Job:", jobId);

console.log("2. Cloning photo...");
const { data: sourcePhoto } = await admin
  .from("photos")
  .select("original_key, room_type, sequence")
  .not("original_key", "is", null)
  .limit(1)
  .single();

if (!sourcePhoto) {
  console.error("FAIL: No source photo");
  process.exit(1);
}

await admin.from("photos").insert({
  job_id: jobId,
  original_key: sourcePhoto.original_key,
  room_type: sourcePhoto.room_type,
  sequence: 1,
});

console.log("3. Simulating Stripe webhook (status → processing)...");
await admin
  .from("jobs")
  .update({ status: "processing", updated_at: new Date().toISOString() })
  .eq("id", jobId);

console.log("4. POST /process (may take ~20s per photo)...");
const start = Date.now();
const processRes = await fetch(`${baseUrl}/api/jobs/${jobId}/process`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
const processBody = await processRes.json().catch(() => ({}));
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

if (processRes.status === 404) {
  console.error("FAIL: /process returned 404 — deploy may not be live yet");
  await admin.from("photos").delete().eq("job_id", jobId);
  await admin.from("jobs").delete().eq("id", jobId);
  process.exit(1);
}

if (!processRes.ok) {
  console.error("FAIL: Process", processRes.status, processBody, `after ${elapsed}s`);
  await admin.from("photos").delete().eq("job_id", jobId);
  await admin.from("jobs").delete().eq("id", jobId);
  process.exit(1);
}

console.log(`   Process response in ${elapsed}s`, processBody);

console.log("5. Polling job status (up to 90s)...");
let job = null;
for (let i = 0; i < 45; i++) {
  await new Promise((r) => setTimeout(r, 2000));
  const { data } = await admin.from("jobs").select("status,failure_message").eq("id", jobId).single();
  job = data;
  const { data: photos } = await admin.from("photos").select("edited_key").eq("job_id", jobId);
  const edited = (photos ?? []).filter((p) => p.edited_key).length;
  console.log(`   ${(i + 1) * 2}s: status=${job?.status}, edited=${edited}/${photos?.length}`);
  if (job?.status === "ready" || job?.status === "failed") break;
}

const { data: photos } = await admin.from("photos").select("edited_key").eq("job_id", jobId);
const edited = (photos ?? []).filter((p) => p.edited_key).length;

console.log(`6. Final: status=${job?.status}, edited=${edited}/${photos?.length}`);
if (job?.failure_message) console.log("   Failure:", job.failure_message);

await admin.from("photos").delete().eq("job_id", jobId);
await admin.from("jobs").delete().eq("id", jobId);

if (job?.status === "ready" && edited > 0) {
  console.log("OK: /process route completed job successfully");
  process.exit(0);
}

console.error("FAIL: Job not ready");
process.exit(1);
