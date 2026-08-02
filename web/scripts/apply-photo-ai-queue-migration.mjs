/**
 * Apply 20260802000000_photo_ai_queue.sql
 * Usage (from web/): node scripts/apply-photo-ai-queue-migration.mjs
 *
 * Needs SUPABASE_ACCESS_TOKEN or SUPABASE_DB_PASSWORD in web/.env.local
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20260802000000_photo_ai_queue.sql"
);

function loadEnv() {
  const env = {};
  for (const envFile of [resolve(__dirname, "../.env.local")]) {
    if (!existsSync(envFile)) continue;
    for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_SERVICE_ROLE_KEY",
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const dbPassword = env.SUPABASE_DB_PASSWORD;
const accessToken = env.SUPABASE_ACCESS_TOKEN;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const sql = readFileSync(migrationPath, "utf8");

async function applyViaManagementApi(projectRef, token) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${await res.text()}`);
  }
}

async function applyViaPostgres(projectRef, password) {
  const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`;
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
}

async function probeColumns() {
  if (!url || !service) return false;
  const res = await fetch(`${url}/rest/v1/photos?select=ai_status,ai_attempts,ai_claimed_at&limit=1`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  return res.ok;
}

if (await probeColumns()) {
  console.log("OK: photo ai_* columns already present.");
  // Still try to ensure RPCs exist when credentials available
}

const projectRef = url ? new URL(url).hostname.split(".")[0] : null;

try {
  if (accessToken && projectRef) {
    console.log("Applying via Supabase Management API…");
    await applyViaManagementApi(projectRef, accessToken);
    console.log("OK: photo AI queue migration applied.");
    process.exit(0);
  }
  if (dbPassword && projectRef) {
    console.log("Applying via Postgres…");
    await applyViaPostgres(projectRef, dbPassword);
    console.log("OK: photo AI queue migration applied.");
    process.exit(0);
  }
} catch (e) {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
}

if (await probeColumns()) {
  console.log("Columns exist but could not (re)apply RPCs automatically.");
  console.log("If claim_next_photo_for_job is missing, paste the migration SQL in Supabase SQL Editor.");
  process.exit(0);
}

console.log(`
Cannot apply automatically — no credentials found.

Add one of these to web/.env.local, then re-run:

  SUPABASE_ACCESS_TOKEN=your_personal_access_token
  # or
  SUPABASE_DB_PASSWORD=your_database_password

Or paste this SQL in Supabase → SQL Editor → Run:

${sql}
`);
process.exit(1);
