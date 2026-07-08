/**
 * Mobile pilot E2E — mirrors native app flows against production.
 * Usage (from mobile/): node scripts/pilot-e2e.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPaths = [
  resolve(__dirname, "../.env"),
  resolve(__dirname, "../../web/.env.local"),
];
const fixturePath = resolve(__dirname, "fixtures/test-room.png");
const baseUrl = (process.env.EXPO_PUBLIC_APP_URL ?? "https://wiselista.com").replace(/\/$/, "");

function loadEnv() {
  const env = {};
  for (const envPath of envPaths) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (!m) continue;
      const key = m[1].trim();
      const val = m[2].trim().replace(/^["']|["']$/g, "").replace(/\r$/, "");
      env[key] = val;
      if (key === "NEXT_PUBLIC_SUPABASE_URL") env.EXPO_PUBLIC_SUPABASE_URL = val;
      if (key === "NEXT_PUBLIC_SUPABASE_ANON_KEY") env.EXPO_PUBLIC_SUPABASE_ANON_KEY = val;
      if (key === "SUPABASE_SERVICE_ROLE_KEY") env.SUPABASE_SERVICE_ROLE_KEY = val;
    }
  }
  return env;
}

function fail(step, msg) {
  console.error(`FAIL [${step}]:`, msg);
  process.exit(1);
}

function pass(step, detail = "") {
  console.log(`PASS [${step}]${detail ? `: ${detail}` : ""}`);
}

const env = loadEnv();
const url = env.EXPO_PUBLIC_SUPABASE_URL ?? env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon) fail("env", "missing Supabase URL/anon in mobile/.env or web/.env.local");

let jobId = null;
const admin = service ? createClient(url, service) : null;

async function cleanup() {
  if (!jobId || !admin) return;
  await admin.from("photos").delete().eq("job_id", jobId);
  await admin.from("jobs").delete().eq("id", jobId);
}

try {
  console.log("=== Mobile pilot E2E ===");
  console.log("API:", baseUrl);
  console.log("");

  const sb = createClient(url, anon);
  const { data: signIn, error: authErr } = await sb.auth.signInWithPassword({
    email: env.WISELISTA_TEST_EMAIL ?? "adam@wiselista.com",
    password: env.WISELISTA_TEST_PASSWORD ?? "wiselista",
  });
  if (authErr || !signIn.session) fail("auth", authErr?.message ?? "no session");
  const token = signIn.session.access_token;
  const userId = signIn.user.id;
  pass("auth", signIn.user.email);

  const { data: jobs, error: listErr } = await sb
    .from("jobs")
    .select("id, status, name, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  if (listErr) fail("job-list", listErr.message);
  pass("job-list", `${jobs?.length ?? 0} job(s) via Supabase`);

  const { data: newJob, error: createErr } = await sb
    .from("jobs")
    .insert({ user_id: userId, status: "draft", name: "Mobile pilot E2E", plan_tier: "core" })
    .select("id")
    .single();
  if (createErr || !newJob) fail("create-job", createErr?.message ?? "no job");
  jobId = newJob.id;
  pass("create-job", jobId.slice(0, 8));

  if (!existsSync(fixturePath)) fail("camera-upload", "missing test-room.png");
  const imageBytes = readFileSync(fixturePath);
  const storageKey = `${userId}/${jobId}/${crypto.randomUUID()}.jpg`;
  const { error: storageErr } = await sb.storage
    .from("wiselista-photos")
    .upload(storageKey, imageBytes, { contentType: "image/jpeg", upsert: false });
  if (storageErr) fail("camera-upload", storageErr.message);
  pass("camera-upload", "direct Supabase storage");

  const { data: photoRow, error: insertErr } = await sb
    .from("photos")
    .insert({
      job_id: jobId,
      room_type: "living_room",
      sequence: 0,
      original_key: storageKey,
    })
    .select("id")
    .single();
  if (insertErr || !photoRow) fail("photo-row", insertErr?.message ?? "no row");
  pass("photo-row", photoRow.id.slice(0, 8));

  const { data: signed } = await sb.storage.from("wiselista-photos").createSignedUrl(storageKey, 3600);
  if (!signed?.signedUrl) fail("thumbnail", "signed URL failed");
  pass("thumbnail", "signed URL OK");

  const form = new FormData();
  form.append("file", new Blob([imageBytes], { type: "image/png" }), "library.png");
  form.append("room_type", "kitchen");
  form.append("sequence", "1");
  const libRes = await fetch(`${baseUrl}/api/jobs/${jobId}/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const libPhoto = await libRes.json().catch(() => ({}));
  if (!libRes.ok) fail("library-upload", libPhoto.error ?? `status ${libRes.status}`);
  pass("library-upload", libPhoto.id?.slice(0, 8) ?? "via API");

  const delRes = await fetch(`${baseUrl}/api/jobs/${jobId}/photos/${libPhoto.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const delBody = await delRes.json().catch(() => ({}));
  if (!delRes.ok || !delBody.ok) fail("delete-photo", delBody.error ?? `status ${delRes.status}`);
  pass("delete-photo", delBody.rid ? `rid=${delBody.rid.slice(0, 8)}` : "removed");

  const submitRes = await fetch(`${baseUrl}/api/jobs/${jobId}/submit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const submitted = await submitRes.json().catch(() => ({}));
  if (!submitRes.ok) fail("submit", submitted.error ?? `status ${submitRes.status}`);
  pass("submit", submitted.skippedPayment ? "payment skipped" : "checkout");

  const processRes = await fetch(`${baseUrl}/api/jobs/${jobId}/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  await processRes.json().catch(() => ({}));

  let status = "processing";
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`${baseUrl}/api/jobs/${jobId}/processing`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const poll = await pollRes.json().catch(() => ({}));
    status = poll.status ?? status;
    if (status === "ready" || status === "failed") break;
  }
  if (status !== "ready") fail("processing", `status=${status}`);
  pass("processing", "ready");

  const zipRes = await fetch(`${baseUrl}/api/jobs/${jobId}/download-zip`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!zipRes.ok) {
    const err = await zipRes.json().catch(() => ({}));
    fail("download-zip", err.error ?? `status ${zipRes.status}`);
  }
  const zipSize = (await zipRes.arrayBuffer()).byteLength;
  if (zipSize < 100) fail("download-zip", "ZIP too small");
  pass("download-zip", `${zipSize} bytes`);

  await cleanup();
  jobId = null;
  pass("cleanup", "done");

  console.log("");
  console.log("=== ALL MOBILE PILOT CHECKS PASSED ===");
} catch (e) {
  await cleanup();
  fail("unexpected", e instanceof Error ? e.message : String(e));
}
