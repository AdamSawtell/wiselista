import { readFileSync, writeFileSync, existsSync } from "fs";

const webEnv = readFileSync("../web/.env.local", "utf8");
const mobilePath = ".env";

function get(key) {
  const m = webEnv.match(new RegExp(`^${key}=(.+)$`, "m"));
  return m?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
}

const url = get("NEXT_PUBLIC_SUPABASE_URL");
const anon = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
let app = get("NEXT_PUBLIC_APP_URL") || "https://wiselista.com";
// Mobile submit API must hit a reachable host; localhost from web .env breaks browser/device tests.
if (/^https?:\/\/localhost(?::\d+)?$/i.test(app) || /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i.test(app)) {
  app = "https://wiselista.com";
}

if (!url || !anon) {
  console.error("FAIL: missing web/.env.local Supabase vars");
  process.exit(1);
}

let mobile = existsSync(mobilePath) ? readFileSync(mobilePath, "utf8") : "";
function set(key, val) {
  const line = `${key}=${val}`;
  if (mobile.match(new RegExp(`^${key}=`, "m"))) {
    mobile = mobile.replace(new RegExp(`^${key}=.*$`, "m"), line);
  } else {
    mobile += `${mobile.endsWith("\n") ? "" : "\n"}${line}\n`;
  }
}

set("EXPO_PUBLIC_SUPABASE_URL", url);
set("EXPO_PUBLIC_SUPABASE_ANON_KEY", anon);
set("EXPO_PUBLIC_APP_URL", app);
writeFileSync(mobilePath, mobile);
console.log("OK: Synced mobile/.env from web/.env.local");
console.log("Host:", new URL(url).hostname);
