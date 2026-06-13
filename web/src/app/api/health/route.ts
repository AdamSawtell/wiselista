import { NextResponse } from "next/server";

/** GET /api/health — for mobile "Test API" and connectivity check. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "wiselista-api",
    timestamp: new Date().toISOString(),
    claidConfigured: Boolean(process.env.CLAID_API_KEY),
    serviceRoleConfigured: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
}
