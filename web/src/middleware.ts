import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/** Allow origin for API if it's our app (Amplify Expo web, wiselista.com, or localhost). */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (origin === "https://wiselista.com") return true;
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return true;
  if (origin.includes("amplifyapp.com")) return true;
  return false;
}

function corsHeaders(origin: string | null) {
  const allowOrigin = origin && isAllowedOrigin(origin) ? origin : "https://wiselista.com";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type, X-Request-Id",
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
