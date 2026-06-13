/** Create a job stuck in processing for browser demo. Prints job URL. */
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
const auth = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: signIn } = await auth.auth.signInWithPassword({
  email: "adam@wiselista.com",
  password: "wiselista",
});

const userId = signIn.user.id;
const { data: newJob } = await admin
  .from("jobs")
  .insert({ user_id: userId, status: "draft", name: "Browser processing test", plan_tier: "core" })
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

console.log("JOB_ID=" + jobId);
console.log("URL=https://wiselista.com/dashboard/jobs/" + jobId);
