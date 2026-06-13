import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

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
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: jobs } = await sb
  .from("jobs")
  .select("id,name,status,failure_message,created_at,updated_at")
  .order("updated_at", { ascending: false })
  .limit(15);

for (const j of jobs ?? []) {
  const { data: photos } = await sb.from("photos").select("id,edited_key").eq("job_id", j.id);
  const edited = (photos ?? []).filter((p) => p.edited_key).length;
  const total = photos?.length ?? 0;
  console.log(
    `${j.id.slice(0, 8)}  ${j.status.padEnd(12)}  ${(j.name || "(no name)").slice(0, 28).padEnd(28)}  ${edited}/${total} edited  ${j.failure_message || ""}`
  );
}
