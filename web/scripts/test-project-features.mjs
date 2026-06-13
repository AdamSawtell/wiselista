/**
 * Test project page APIs: property context, share, zip.
 * Usage: TEST_BASE_URL=http://localhost:3001 node scripts/test-project-features.mjs [jobId]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const jobId = process.argv[2] ?? "5c252165-4a31-409f-a789-d09b60eed9ca";
const base = (process.env.TEST_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");

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
const { data: signIn, error } = await auth.auth.signInWithPassword({
  email: "adam@wiselista.com",
  password: "wiselista",
});
if (error || !signIn.session) {
  console.error("FAIL: sign in", error?.message);
  process.exit(1);
}
const token = signIn.session.access_token;
const headers = { Authorization: `Bearer ${token}` };

const patch = await fetch(`${base}/api/jobs/${jobId}`, {
  method: "PATCH",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({
    property_address: "12 Oak Street, Sydney",
    listing_type: "sale",
    target_portal: "domain_com_au",
  }),
});
const patchBody = await patch.json().catch(() => ({}));
console.log("PATCH property:", patch.status, patch.ok ? "OK" : patchBody);

const share = await fetch(`${base}/api/jobs/${jobId}/share`, { method: "POST", headers });
const shareBody = await share.json().catch(() => ({}));
console.log("POST share:", share.status, shareBody);

const zip = await fetch(`${base}/api/jobs/${jobId}/download-zip`, { headers });
console.log("GET zip:", zip.status, zip.headers.get("content-type"));
if (zip.ok) {
  const buf = await zip.arrayBuffer();
  console.log("ZIP size:", buf.byteLength, "bytes");
}

let failed = 0;
if (!patch.ok) failed++;
if (!share.ok) failed++;
if (!zip.ok) failed++;

if (failed === 0) {
  console.log("OK: All project feature APIs passed");
  process.exit(0);
}
console.error(`FAIL: ${failed} API(s) failed — run migration SQL if columns are missing`);
process.exit(1);
