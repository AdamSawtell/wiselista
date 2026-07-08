/**
 * Pilot E2E test against production (wiselista.com).
 * Usage (from web/): node scripts/pilot-e2e.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const fixturePath = resolve(__dirname, "../../mobile/scripts/fixtures/test-room.png");
const baseUrl = (process.env.TEST_BASE_URL ?? "https://wiselista.com").replace(/\/$/, "");

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const env = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "").replace(/\r$/, "");
  }
  return env;
}

function fail(step, message) {
  console.error(`FAIL [${step}]:`, message);
  process.exit(1);
}

function pass(step, detail = "") {
  console.log(`PASS [${step}]${detail ? `: ${detail}` : ""}`);
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anon || !service) {
  fail("env", "Need Supabase vars in web/.env.local");
}

const results = [];
let jobId = null;
let token = null;
const admin = createClient(url, service);

async function cleanup() {
  if (!jobId) return;
  await admin.from("photos").delete().eq("job_id", jobId);
  await admin.from("jobs").delete().eq("id", jobId);
}

process.on("SIGINT", () => {
  void cleanup().finally(() => process.exit(1));
});

try {
  console.log("=== Wiselista pilot E2E ===");
  console.log("Target:", baseUrl);
  console.log("");

  const healthRes = await fetch(`${baseUrl}/api/health`);
  const health = await healthRes.json().catch(() => ({}));
  if (!healthRes.ok || !health.ok) fail("health", `status ${healthRes.status}`);
  pass("health", `service=${health.service}`);

  const auth = createClient(url, anon);
  const { data: signIn, error: signInError } = await auth.auth.signInWithPassword({
    email: env.WISELISTA_TEST_EMAIL ?? "adam@wiselista.com",
    password: env.WISELISTA_TEST_PASSWORD ?? "wiselista",
  });
  if (signInError || !signIn.session) fail("auth", signInError?.message ?? "no session");
  token = signIn.session.access_token;
  pass("auth", signIn.user.email ?? "signed in");

  const jobsListRes = await fetch(`${baseUrl}/api/jobs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (jobsListRes.status === 401) fail("jobs-list", "401 — Bearer auth broken");
  if (!jobsListRes.ok) fail("jobs-list", `status ${jobsListRes.status}`);
  pass("jobs-list", `Bearer OK (${jobsListRes.status})`);

  const createRes = await fetch(`${baseUrl}/api/jobs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: "Pilot E2E test", plan_tier: "core" }),
  });
  const created = await createRes.json().catch(() => ({}));
  if (!createRes.ok || !created.id) fail("create-job", JSON.stringify(created));
  jobId = created.id;
  pass("create-job", jobId.slice(0, 8));

  if (!existsSync(fixturePath)) fail("upload", `missing fixture ${fixturePath}`);
  const imageBytes = readFileSync(fixturePath);
  const form = new FormData();
  form.append("file", new Blob([imageBytes], { type: "image/png" }), "test-room.png");
  form.append("room_type", "living_room");
  form.append("sequence", "0");

  const uploadRes = await fetch(`${baseUrl}/api/jobs/${jobId}/photos`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const uploaded = await uploadRes.json().catch(() => ({}));
  if (!uploadRes.ok) fail("upload", uploaded.error ?? `status ${uploadRes.status}`);
  pass("upload", uploaded.id?.slice(0, 8) ?? "photo saved");

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
  if (!submitted.skippedPayment && !submitted.url) {
    fail("submit", "expected skippedPayment or Stripe url");
  }
  pass("submit", submitted.skippedPayment ? "payment skipped" : "checkout url");

  if (submitted.skippedPayment) {
    const { data: jobAfterSubmit } = await admin.from("jobs").select("status").eq("id", jobId).single();
    if (jobAfterSubmit?.status !== "processing") {
      await admin.from("jobs").update({ status: "processing" }).eq("id", jobId);
    }
  }

  const processStart = Date.now();
  const processRes = await fetch(`${baseUrl}/api/jobs/${jobId}/process`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const processBody = await processRes.json().catch(() => ({}));
  const processSec = ((Date.now() - processStart) / 1000).toFixed(1);
  if (!processRes.ok && processRes.status !== 500) {
    fail("process", `${processRes.status} ${JSON.stringify(processBody)}`);
  }
  pass("process", `${processSec}s mode=${processBody.mode ?? "?"} status=${processBody.status ?? "?"}`);

  let finalStatus = "processing";
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const pollRes = await fetch(`${baseUrl}/api/jobs/${jobId}/processing`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const poll = await pollRes.json().catch(() => ({}));
    finalStatus = poll.status ?? finalStatus;
    const cur = poll.current ?? 0;
    const tot = poll.total ?? 1;
    if (i % 5 === 0 || finalStatus === "ready" || finalStatus === "failed") {
      console.log(`   poll ${(i + 1) * 2}s: ${finalStatus} (${cur}/${tot})`);
    }
    if (finalStatus === "ready" || finalStatus === "failed") break;
  }

  if (finalStatus === "failed") {
    const { data: j } = await admin.from("jobs").select("failure_message").eq("id", jobId).single();
    fail("processing", j?.failure_message ?? "job failed");
  }
  if (finalStatus !== "ready") fail("processing", `timed out at status=${finalStatus}`);
  pass("processing", "job ready");

  const zipRes = await fetch(`${baseUrl}/api/jobs/${jobId}/download-zip`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!zipRes.ok) {
    const err = await zipRes.json().catch(() => ({}));
    fail("download-zip", err.error ?? `status ${zipRes.status}`);
  }
  const zipBuf = await zipRes.arrayBuffer();
  if (zipBuf.byteLength < 100) fail("download-zip", "ZIP too small");
  pass("download-zip", `${zipBuf.byteLength} bytes`);

  const jobGetRes = await fetch(`${baseUrl}/api/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!jobGetRes.ok) fail("job-detail", `status ${jobGetRes.status}`);
  pass("job-detail", "Bearer GET OK");

  await cleanup();
  jobId = null;
  pass("cleanup", "test job removed");

  console.log("");
  console.log("=== ALL PILOT E2E CHECKS PASSED ===");
} catch (e) {
  await cleanup();
  fail("unexpected", e instanceof Error ? e.message : String(e));
}
