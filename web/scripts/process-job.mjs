/**
 * Manually run Claid processing for a stuck job.
 * Usage: node scripts/process-job.mjs <jobId>
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const jobId = process.argv[2];

if (!jobId) {
  console.error("Usage: node scripts/process-job.mjs <jobId>");
  process.exit(1);
}

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
if (!env.CLAID_API_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("FAIL: Need CLAID_API_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
process.env.CLAID_API_KEY = env.CLAID_API_KEY;

const mod = await import("../src/lib/ai-adapter.ts").catch(() => ({}));
const processJobWithRealAI = mod.processJobWithRealAI;
if (!processJobWithRealAI) {
  // Run inline if TS import fails in plain node
  const BUCKET = "wiselista-photos";
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: job } = await sb.from("jobs").select("id,user_id,status").eq("id", jobId).single();
  if (!job) {
    console.error("FAIL: Job not found");
    process.exit(1);
  }
  console.log("Job status before:", job.status);
  const { data: photos } = await sb.from("photos").select("id,original_key,room_type").eq("job_id", jobId);
  for (const p of photos ?? []) {
    const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(p.original_key, 3600);
    const ops = {
      restorations: { upscale: "smart_enhance", decompress: "auto", polish: false },
      resizing: { fit: "bounds", width: "150%", height: "150%" },
      adjustments: {
        hdr: { intensity: 100, stitching: false },
        exposure: p.room_type === "living_room" ? 12 : 10,
        saturation: 10,
        contrast: 10,
        sharpness: 12,
      },
    };
    const res = await fetch("https://api.claid.ai/v1/image/edit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.CLAID_API_KEY}`,
      },
      body: JSON.stringify({
        input: signed?.signedUrl,
        operations: ops,
        output: { format: { type: "jpeg", quality: 88 } },
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("FAIL: Claid", res.status, body);
      process.exit(1);
    }
    const img = await fetch(body.data.output.tmp_url);
    const editedKey = `${job.user_id}/${jobId}/edited/${p.id}.jpg`;
    await sb.storage.from(BUCKET).upload(editedKey, await img.arrayBuffer(), {
      contentType: "image/jpeg",
      upsert: true,
    });
    await sb.from("photos").update({ edited_key: editedKey }).eq("id", p.id);
    console.log("OK: processed", p.id.slice(0, 8));
  }
  await sb
    .from("jobs")
    .update({ status: "ready", completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", jobId);
  console.log("OK: Job ready");
  process.exit(0);
}

await processJobWithRealAI(jobId);
console.log("OK: Job processing complete");
