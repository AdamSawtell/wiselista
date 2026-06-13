/** Test reprocess endpoint on production */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const baseUrl = "https://wiselista.com";
const jobId = "5c252165-4a31-409f-a789-d09b60eed9ca";

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

const { data: photo } = await admin
  .from("photos")
  .select("id, edited_key")
  .eq("job_id", jobId)
  .limit(1)
  .single();

console.log("photo:", photo?.id?.slice(0, 8));

const start = Date.now();
const res = await fetch(`${baseUrl}/api/jobs/${jobId}/photos/${photo.id}/reprocess`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
const body = await res.json().catch(() => ({}));
console.log(`reprocess: ${res.status} in ${((Date.now() - start) / 1000).toFixed(1)}s`, body);
