/**
 * Soak test: N photos, submit, process one-by-one until ready (simulates UI + cron).
 * Usage: node scripts/soak-multi-photo.mjs [count=3]
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const count = Math.min(25, Math.max(1, Number(process.argv[2] ?? 3)));
const baseUrl = (process.env.TEST_BASE_URL ?? "https://wiselista.com").replace(/\/$/, "");
const fixturePath = resolve(__dirname, "../../mobile/scripts/fixtures/test-room.png");

const env = {};
for (const line of readFileSync(resolve(__dirname, "../.env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const auth = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const { data: signIn, error } = await auth.auth.signInWithPassword({
  email: "adam@wiselista.com",
  password: "wiselista",
});
if (error) throw error;
const token = signIn.session.access_token;

console.log(`Soak ${count} photos → ${baseUrl}`);

const createRes = await fetch(`${baseUrl}/api/jobs`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({ name: `Soak ${count}p ${Date.now()}`, plan_tier: count > 15 ? "pro" : "core" }),
});
const created = await createRes.json();
if (!created.id) throw new Error(JSON.stringify(created));
const jobId = created.id;
console.log("job", jobId);

if (!existsSync(fixturePath)) throw new Error("missing fixture");
const bytes = readFileSync(fixturePath);
const rooms = ["living_room", "kitchen", "bedroom", "bathroom", "exterior", "other"];

for (let i = 0; i < count; i++) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "image/png" }), `room-${i}.png`);
  form.append("room_type", rooms[i % rooms.length]);
  form.append("sequence", String(i));
  const up = await fetch(`${baseUrl}/api/jobs/${jobId}/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!up.ok) throw new Error(`upload ${i} ${up.status}`);
  process.stdout.write(`u${i + 1} `);
}
console.log("uploaded");

const submit = await fetch(`${baseUrl}/api/jobs/${jobId}/submit`, {
  method: "POST",
  headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
console.log("submit", submit.status, await submit.text());

let status = "processing";
for (let i = 0; i < count * 4 + 10; i++) {
  const proc = await fetch(`${baseUrl}/api/jobs/${jobId}/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await proc.json().catch(() => ({}));
  status = body.status ?? status;
  console.log(
    `step ${i + 1}`,
    proc.status,
    status,
    `ready=${body.ready ?? "?"} total=${body.total ?? "?"}`
  );
  if (status === "ready" || status === "failed") break;
  await new Promise((r) => setTimeout(r, 1000));
}

const { data: job } = await admin.from("jobs").select("status, failure_message").eq("id", jobId).single();
const { data: photos } = await admin.from("photos").select("id, edited_key, ai_status, ai_attempts").eq("job_id", jobId);
const ready = (photos ?? []).filter((p) => p.edited_key).length;
console.log("final", job, `${ready}/${photos?.length}`);

const pass = status === "ready" && ready === count;
if (pass) {
  await admin.from("photos").delete().eq("job_id", jobId);
  await admin.from("jobs").delete().eq("id", jobId);
  console.log("SOAK PASS (cleaned)");
} else {
  console.log("SOAK FAIL — job left for inspection:", jobId);
}
process.exit(pass ? 0 : 1);
