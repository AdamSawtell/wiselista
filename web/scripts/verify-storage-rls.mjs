/**
 * Verify storage path-scoped RLS is active in Supabase.
 * Usage (from web/): node scripts/verify-storage-rls.mjs
 *
 * Optional env: WISELISTA_TEST_EMAIL, WISELISTA_TEST_PASSWORD
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = {};
  for (const envPath of [
    resolve(__dirname, "../../mobile/.env"),
    resolve(__dirname, "../.env.local"),
  ]) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "").replace(/\r$/, "");
    }
  }
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "WISELISTA_TEST_EMAIL",
    "WISELISTA_TEST_PASSWORD",
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function isStorageAccessDenied(error) {
  if (!error) return false;
  const status = "statusCode" in error ? error.statusCode : undefined;
  if (status === 403 || status === 401) return true;
  const message = String(error.message ?? "");
  return /row-level security|violates policy|not authorized|permission denied|access denied/i.test(
    message
  );
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const testEmail = env.WISELISTA_TEST_EMAIL ?? "adam@wiselista.com";
const testPassword = env.WISELISTA_TEST_PASSWORD ?? "wiselista";

if (!url || !anon) {
  console.error("FAIL: missing Supabase URL/anon key (web/.env.local or mobile/.env)");
  process.exit(1);
}

const sb = createClient(url, anon);
const { data: signIn, error: authErr } = await sb.auth.signInWithPassword({
  email: testEmail,
  password: testPassword,
});
if (authErr || !signIn.user) {
  console.error("FAIL: sign in:", authErr?.message);
  process.exit(1);
}

const userId = signIn.user.id;
const ownKey = userId + "/rls-verify/" + crypto.randomUUID() + ".txt";
const otherKey = "00000000-0000-0000-0000-000000000001/rls-verify/" + crypto.randomUUID() + ".txt";
const blob = new Blob(["rls-check"], { type: "text/plain" });

const ownUpload = await sb.storage.from("wiselista-photos").upload(ownKey, blob, { upsert: false });
if (ownUpload.error) {
  console.error("FAIL: own-path upload:", ownUpload.error.message);
  process.exit(1);
}
console.log("OK: own-path upload");

const otherUpload = await sb.storage.from("wiselista-photos").upload(otherKey, blob, { upsert: false });
if (!otherUpload.error) {
  await sb.storage.from("wiselista-photos").remove([otherKey]);
  console.error("FAIL: other-path upload should be blocked but succeeded");
  process.exit(1);
}
if (!isStorageAccessDenied(otherUpload.error)) {
  console.error(
    "FAIL: other-path upload failed for unexpected reason:",
    otherUpload.error.message
  );
  process.exit(1);
}
console.log("OK: other-path upload blocked by RLS");

const { data: signed, error: signErr } = await sb.storage.from("wiselista-photos").createSignedUrl(ownKey, 60);
if (signErr || !signed?.signedUrl) {
  console.error("FAIL: own-path signed URL:", signErr?.message);
  process.exit(1);
}
console.log("OK: own-path signed URL");

await sb.storage.from("wiselista-photos").remove([ownKey]);
console.log("PASS: storage RLS path scoping verified");
