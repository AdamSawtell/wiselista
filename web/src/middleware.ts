import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Origins allowed for API (mobile app in browser, web app). */
const CORS_ORIGINS = [
  "https://main.d2p8p12cz1my9h.amplifyapp.com",
  "https://wiselista.com",
  "http://localhost:3000",
  "http://localhost:8081",
];

function corsHeaders(origin: string | null) {
  const allowOrigin =
    origin && CORS_ORIGINS.some((o) => origin === o || origin.startsWith(o + "/"))
      ? origin
      : CORS_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Refresh Supabase auth session on every request so Server Components see a valid session.
 * Without this, getUser() in dashboard/layout can fail (400/invalid token) and users get stuck.
 * Also adds CORS for /api so the mobile app (Expo web at main.xxx.amplifyapp.com) can call wiselista.com API.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const origin = request.headers.get("origin");

  if (isApi && request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
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
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
