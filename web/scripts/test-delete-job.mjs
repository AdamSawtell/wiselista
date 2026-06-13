/**
 * Test DELETE /api/jobs/:id with a real user session.
 * Usage: node scripts/test-delete-job.mjs [jobId]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const jobId = process.argv[2] ?? "3224b220-320b-4ff8-bf8a-d5e281febed2";
const baseUrl = process.env.TEST_BASE_URL ?? "http://localhost:3000";

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
  console.error("FAIL: Missing Supabase env in .env.local");
  process.exit(1);
}

const auth = createClient(url, anon);
const { data: signIn, error: signInError } = await auth.auth.signInWithPassword({
  email: "adam@wiselista.com",
  password: "wiselista",
});

if (signInError || !signIn.session) {
  console.error("FAIL: Sign in failed", signInError?.message);
  process.exit(1);
}

const token = signIn.session.access_token;
const res = await fetch(`${baseUrl}/api/jobs/${jobId}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
    Cookie: signIn.session
      ? `sb-${new URL(url).hostname.split(".")[0]}-auth-token=base64-${Buffer.from(JSON.stringify(signIn.session)).toString("base64")}`
      : "",
  },
});

const body = await res.json().catch(() => ({}));
console.log("DELETE status:", res.status, body);

if (!res.ok) {
  process.exit(1);
}

if (service) {
  const admin = createClient(url, service);
  const { data: job } = await admin.from("jobs").select("id").eq("id", jobId).maybeSingle();
  console.log(job ? "FAIL: Job still in DB" : "OK: Job removed from DB");
  process.exit(job ? 1 : 0);
}

console.log("OK: DELETE returned success");
