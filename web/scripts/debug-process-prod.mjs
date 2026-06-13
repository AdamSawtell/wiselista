/**
 * Debug production /process — inspect job fields after call.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const baseUrl = "https://wiselista.com";

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
const auth = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: signIn } = await auth.auth.signInWithPassword({
  email: "adam@wiselista.com",
  password: "wiselista",
});
const token = signIn.session.access_token;
const userId = signIn.user.id;

const { data: newJob } = await admin
  .from("jobs")
  .insert({ user_id: userId, status: "draft", name: "Process debug 2", plan_tier: "core" })
  .select("id")
  .single();
const jobId = newJob.id;

const { data: src } = await admin
  .from("photos")
  .select("original_key, room_type")
  .not("original_key", "is", null)
  .limit(1)
  .single();

await admin.from("photos").insert({
  job_id: jobId,
  original_key: src.original_key,
  room_type: src.room_type,
  sequence: 1,
});

await admin.from("jobs").update({ status: "processing" }).eq("id", jobId);

console.log("jobId:", jobId);

const res = await fetch(`${baseUrl}/api/jobs/${jobId}/process`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
const body = await res.json();
console.log("POST /process:", res.status, body);

const { data: job, error: jobErr } = await admin
  .from("jobs")
  .select("*")
  .eq("id", jobId)
  .single();
console.log("job after:", jobErr?.message ?? job);

const { data: photos } = await admin.from("photos").select("*").eq("job_id", jobId);
console.log("photos:", photos);

// cleanup
await admin.from("photos").delete().eq("job_id", jobId);
await admin.from("jobs").delete().eq("id", jobId);
