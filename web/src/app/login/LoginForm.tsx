"use client";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionError = searchParams.get("error") === "session";

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md card p-8 shadow-md text-center">
          <h1 className="text-xl font-bold text-slate-900">Supabase not configured</h1>
          <p className="mt-3 text-sm text-slate-600">
            Add <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to{" "}
            <code className="rounded bg-slate-100 px-1 py-0.5">web/.env.local</code>, then restart the dev server.
          </p>
          <p className="mt-4 text-xs text-slate-500">See <code className="rounded bg-slate-100 px-1">.env.example</code> in the web folder.</p>
          <Link href="/" className="btn-secondary mt-6 inline-block">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">Sign in to Wiselista</h1>
            <p className="mt-2 text-sm text-slate-600">
              Property photos, AI-edited. For agents, rental managers & homeowners.
            </p>
          </div>
          {sessionError && (
            <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Your session may have expired or the dashboard couldn’t load. Please sign in again.
            </div>
          )}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="mt-1.5 block w-full rounded-lg border border-wiselista-border bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="mt-1.5 block w-full rounded-lg border border-wiselista-border bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
              />
            </div>
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-500">
            No account? Create one in your Supabase project (Auth) or ask your team for access.
          </p>
        </div>
        <p className="mt-6 text-center">
          <Link href="/" className="text-sm text-wiselista-accent hover:underline">
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
