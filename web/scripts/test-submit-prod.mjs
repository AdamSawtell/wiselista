/**
 * Test POST /api/jobs/:id/submit on production.
 * Usage: node scripts/test-submit-prod.mjs [jobId] [promoCode]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const baseUrl = (process.env.TEST_BASE_URL ?? "https://wiselista.com").replace(/\/$/, "");
const jobId = process.argv[2] ?? "fa3cc386-0640-4d4d-a801-30bb03bcb7dc";
const promoCode = process.argv[3];

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
if (!url || !anon) {
  console.error("FAIL: Need Supabase env in .env.local");
  process.exit(1);
}

const auth = createClient(url, anon);
const { data: signIn, error: signInError } = await auth.auth.signInWithPassword({
  email: "adam@wiselista.com",
  password: "wiselista",
});
if (signInError || !signIn.session) {
  console.error("FAIL: Sign in", signInError?.message);
  process.exit(1);
}

const token = signIn.session.access_token;
const body = promoCode ? { promo_code: promoCode } : {};
console.log("POST", `${baseUrl}/api/jobs/${jobId}/submit`, body);

const res = await fetch(`${baseUrl}/api/jobs/${jobId}/submit`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(body),
});

console.log("status", res.status, res.headers.get("content-type"));
const text = await res.text();
console.log("body", text.slice(0, 1000));
