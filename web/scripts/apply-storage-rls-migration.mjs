/**
 * Apply storage path-scoped RLS migration (20250708000000_storage_rls_user_path.sql).
 *
 * Usage (from web/):
 *   node scripts/apply-storage-rls-migration.mjs
 *
 * Requires one of:
 *   - SUPABASE_ACCESS_TOKEN (Supabase dashboard → Account → Access tokens)
 *   - SUPABASE_DB_PASSWORD in web/.env.local (Project Settings → Database)
 *
 * Falls back to printing SQL for manual run in Supabase SQL Editor.
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationPath = resolve(
  __dirname,
  "../../supabase/migrations/20250708000000_storage_rls_user_path.sql"
);

function loadEnv() {
  const env = {};
  // mobile/.env first, then web/.env.local — later files win for project URL/keys.
  for (const envFile of [
    resolve(__dirname, "../../mobile/.env"),
    resolve(__dirname, "../.env.local"),
  ]) {
    if (!existsSync(envFile)) continue;
    for (const line of readFileSync(envFile, "utf8").split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  for (const key of [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "EXPO_PUBLIC_SUPABASE_URL",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_ACCESS_TOKEN",
    "SUPABASE_DB_PASSWORD",
  ]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.EXPO_PUBLIC_SUPABASE_URL;
const dbPassword = env.SUPABASE_DB_PASSWORD;
const accessToken = env.SUPABASE_ACCESS_TOKEN;
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
    const body = await res.text();
    throw new Error(`Management API ${res.status}: ${body}`);
  }
}

async function applyViaPostgres(projectRef, password) {
  const connectionString = `postgresql://postgres.${projectRef}:${encodeURIComponent(password)}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`;
  let pg;
  try {
    ({ default: pg } = await import("pg"));
  } catch {
    throw new Error("Postgres apply requires devDependency pg — run: npm install (from web/)");
  }
  const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await client.query(sql);
  await client.end();
}

const projectRef = url ? new URL(url).hostname.split(".")[0] : "mxylwsmyljcevzbupmkz";

try {
  if (accessToken) {
    console.log("Applying via Supabase Management API…");
    await applyViaManagementApi(projectRef, accessToken);
    console.log("OK: Storage RLS migration applied.");
    process.exit(0);
  }

  if (dbPassword) {
    console.log("Applying via Postgres…");
    await applyViaPostgres(projectRef, dbPassword);
    console.log("OK: Storage RLS migration applied.");
    process.exit(0);
  }
} catch (e) {
  console.error("FAIL:", e instanceof Error ? e.message : e);
  process.exit(1);
}

console.log(`
Cannot apply automatically — no credentials found.

Add one of these to web/.env.local (or set as env vars), then re-run:

  SUPABASE_ACCESS_TOKEN=your_personal_access_token
  # or
  SUPABASE_DB_PASSWORD=your_database_password

Or paste this SQL in Supabase → SQL Editor → Run:

${sql}
`);
process.exit(1);
