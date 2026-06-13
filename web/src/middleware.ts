import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Allowed origins for CORS (Expo Web in browser, wiselista.com, localhost dev).
 * When allowed, we reflect the exact request Origin so preflight succeeds.
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === "https://wiselista.com") return true;
  if (origin === "https://mobile.wiselista.com") return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  if (origin.endsWith(".amplifyapp.com") || origin === "https://amplifyapp.com") return true;
  return false;
}

function corsHeaders(origin: string | null): Record<string, string> {
  const allowOrigin = origin && isAllowedOrigin(origin) ? origin : "";
  const headers: Record<string, string> = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Request-Id",
    "Access-Control-Allow-Credentials": "true",
  };
  if (allowOrigin) headers["Access-Control-Allow-Origin"] = allowOrigin;
  return headers;
}

/**
 * For /api: refresh session and set CORS so Expo Web (browser) can call the API.
 * OPTIONS preflight returns 204 with same CORS headers; other methods get CORS on the response.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const origin = request.headers.get("origin");

  if (isApi && request.method === "OPTIONS") {
    const headers = corsHeaders(origin);
    headers["Access-Control-Max-Age"] = "86400";
    return new NextResponse(null, { status: 204, headers });
  }

  const response = await updateSession(request);

  if (isApi) {
    for (const [key, value] of Object.entries(corsHeaders(origin))) {
      response.headers.set(key, value);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
