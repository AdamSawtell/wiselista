/**
 * Apply job project features migration via direct Postgres (optional).
 * Set SUPABASE_DB_PASSWORD in .env.local, or run SQL manually in Supabase SQL Editor.
 * Usage: node scripts/apply-job-features-migration.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
const migrationPath = resolve(__dirname, "../../supabase/migrations/20250613100000_job_project_features.sql");

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
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = env.SUPABASE_DB_PASSWORD;

if (!url || !service) {
  console.error("FAIL: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in web/.env.local");
  process.exit(1);
}

const probe = await fetch(`${url}/rest/v1/jobs?select=share_token&limit=1`, {
  headers: { apikey: service, Authorization: `Bearer ${service}` },
});

if (probe.ok) {
  console.log("OK: Job project feature columns already exist.");
  process.exit(0);
}

const sql = readFileSync(migrationPath, "utf8");

if (dbPassword) {
  const ref = new URL(url).hostname.split(".")[0];
  const connectionString = `postgresql://postgres.${ref}:${encodeURIComponent(dbPassword)}@aws-0-ap-southeast-2.pooler.supabase.com:6543/postgres`;
  try {
    const { default: pg } = await import("pg");
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
    await client.connect();
    await client.query(sql);
    await client.end();
    console.log("OK: Migration applied via Postgres.");
    process.exit(0);
  } catch (e) {
    console.error("FAIL: Postgres migration:", e instanceof Error ? e.message : e);
  }
}

console.log(`
The new project page columns are not in your database yet.

Run this in Supabase → SQL Editor:

${sql}
`);
process.exit(1);
