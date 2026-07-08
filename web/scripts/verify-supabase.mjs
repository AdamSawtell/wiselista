/**
 * Verify Supabase connection after a fresh project setup.
 * Usage (from web/): node scripts/verify-supabase.mjs
 * Reads web/.env.local — needs URL, anon key, and service role key.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function loadEnv() {
  const raw = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim().replace(/\r$/, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  console.error("FAIL: Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

console.log("Checking Supabase at", url);

const admin = createClient(url, service);

const { data: users, error: usersError } = await admin.auth.admin.listUsers({ perPage: 5 });
if (usersError) {
  console.error("FAIL: Auth admin —", usersError.message);
  process.exit(1);
}
console.log("OK: Auth —", users.users.length, "user(s)", users.users.map((u) => u.email).join(", ") || "(none yet)");

const { error: jobsError } = await admin.from("jobs").select("id").limit(1);
if (jobsError) {
  console.error("FAIL: jobs table —", jobsError.message, "\n→ Run supabase/setup-fresh-project.sql in SQL Editor");
  process.exit(1);
}
console.log("OK: jobs table exists");

const { data: buckets, error: bucketError } = await admin.storage.listBuckets();
if (bucketError) {
  console.error("FAIL: Storage —", bucketError.message);
  process.exit(1);
}
const hasBucket = buckets?.some((b) => b.name === "wiselista-photos" || b.id === "wiselista-photos");
if (!hasBucket) {
  console.error("FAIL: Bucket wiselista-photos not found — run setup-fresh-project.sql");
  process.exit(1);
}
console.log("OK: wiselista-photos bucket exists");

console.log("\nAll checks passed. Sign in at /login with your Supabase user.");
