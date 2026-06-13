/**
 * End-to-end test: create draft job, clone a photo, submit (Claid), verify ready.
 * Usage: TEST_BASE_URL=http://localhost:3001 node scripts/test-submit-claid.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const baseUrl = (process.env.TEST_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

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

if (!url || !anon || !service || !env.CLAID_API_KEY) {
  console.error("FAIL: Need Supabase env + CLAID_API_KEY in .env.local");
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

console.log("1. Creating draft job (via service role)...");
const { data: newJob, error: jobError } = await admin
  .from("jobs")
  .insert({ user_id: userId, status: "draft", name: "Claid E2E Test" })
  .select("id")
  .single();

if (jobError || !newJob) {
  console.error("FAIL: Create job", jobError?.message);
  process.exit(1);
}
const jobId = newJob.id;
console.log("   Job:", jobId.slice(0, 8));

console.log("2. Cloning photo from existing job...");
const { data: sourcePhoto } = await admin
  .from("photos")
  .select("original_key, room_type, sequence")
  .not("original_key", "is", null)
  .limit(1)
  .single();

if (!sourcePhoto) {
  console.error("FAIL: No source photo in DB");
  process.exit(1);
}

const { error: photoError } = await admin.from("photos").insert({
  job_id: jobId,
  original_key: sourcePhoto.original_key,
  room_type: sourcePhoto.room_type,
  sequence: 1,
});

if (photoError) {
  console.error("FAIL: Insert photo", photoError.message);
  process.exit(1);
}
console.log("   Photo cloned");

console.log("3. Submitting for Claid processing (may take ~20s)...");
const start = Date.now();
const submitRes = await fetch(`${baseUrl}/api/jobs/${jobId}/submit`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
const submitBody = await submitRes.json().catch(() => ({}));
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

if (!submitRes.ok) {
  console.error("FAIL: Submit", submitRes.status, submitBody, `after ${elapsed}s`);
  process.exit(1);
}
console.log(`   Submit OK in ${elapsed}s`, submitBody);

console.log("4. Verifying job status...");
const { data: job } = await admin.from("jobs").select("status,failure_message").eq("id", jobId).single();
const { data: photos } = await admin.from("photos").select("edited_key").eq("job_id", jobId);
const edited = (photos ?? []).filter((p) => p.edited_key).length;

console.log(`   Status: ${job?.status}, edited: ${edited}/${photos?.length}`);
if (job?.failure_message) console.log("   Failure:", job.failure_message);

if (job?.status === "ready" && edited > 0) {
  console.log("OK: Claid submit flow completed");
  // cleanup test job
  await admin.from("photos").delete().eq("job_id", jobId);
  await admin.from("jobs").delete().eq("id", jobId);
  console.log("   (test job cleaned up)");
  process.exit(0);
}

console.error("FAIL: Job not ready with edited photos");
process.exit(1);
