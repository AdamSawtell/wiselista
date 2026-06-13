"use client";

import { createClient } from "@/lib/supabase/client";
import { clearSupabaseAuthCookies } from "@/lib/supabase/clear-auth-cookies";

export function SignOutButton({ className = "text-sm text-slate-600 underline hover:text-slate-900" }: { className?: string }) {
  async function handleSignOut() {
    const supabase = createClient();
    clearSupabaseAuthCookies(false);
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className={className}
    >
      Sign out
    </button>
  );
}
