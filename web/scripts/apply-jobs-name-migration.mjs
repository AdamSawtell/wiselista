/**
 * Apply jobs.name column if missing (run once after deploy).
 * Usage: node scripts/apply-jobs-name-migration.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

function loadEnv() {
  if (!existsSync(envPath)) return {};
  const lines = readFileSync(envPath, "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error("FAIL: Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in web/.env.local");
  process.exit(1);
}

// Probe whether name column exists by selecting it
const probe = await fetch(`${url}/rest/v1/jobs?select=name&limit=1`, {
  headers: {
    apikey: service,
    Authorization: `Bearer ${service}`,
  },
});

if (probe.ok) {
  console.log("OK: jobs.name column already exists.");
  process.exit(0);
}

console.log(`
The jobs.name column is not in your database yet.

Run this in Supabase → SQL Editor:

  ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS name TEXT;

Then redeploy is not required — only the SQL step.
`);
process.exit(1);
