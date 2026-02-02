/**
 * Supabase session refresh for Next.js middleware.
 * Refreshes the auth token on every request so Server Components see a valid session.
 * Required for SSR: without this, getUser() in Server Components can fail with 400/invalid token.
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, (options ?? {}) as { path?: string; maxAge?: number; sameSite?: "lax" | "strict" | "none"; secure?: boolean; httpOnly?: boolean });
        });
      },
    },
  });

  // Refresh session if expired. This updates cookies when the token is refreshed.
  await supabase.auth.getUser();

  return response;
}
