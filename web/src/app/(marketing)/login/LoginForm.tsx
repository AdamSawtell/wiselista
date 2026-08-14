"use client";

import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { clearSupabaseAuthCookies } from "@/lib/supabase/clear-auth-cookies";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

type Mode = "signin" | "signup";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [clearing, setClearing] = useState(false);
  const searchParams = useSearchParams();
  const sessionError = searchParams.get("error") === "session";

  useEffect(() => {
    if (!sessionError || !isSupabaseConfigured()) return;
    clearSupabaseAuthCookies(true);
    const supabase = createClient();
    void supabase.auth.signOut({ scope: "global" });
  }, [sessionError]);

  async function clearAuthState() {
    const supabase = createClient();
    clearSupabaseAuthCookies(false);
    await supabase.auth.signOut({ scope: "global" });
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md card p-8 shadow-md text-center">
          <h1 className="text-xl font-bold text-slate-900">Sign in unavailable</h1>
          <p className="mt-3 text-sm text-slate-600">
            The sign-in service is not configured. Email{" "}
            <a href="mailto:info@wiselista.com" className="font-medium text-wiselista-accent hover:underline">
              info@wiselista.com
            </a>{" "}
            and we will help you in.
          </p>
          <Link href="/" className="btn-secondary mt-6 inline-block">
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  const supabase = createClient();

  async function handleClearSession() {
    setClearing(true);
    await clearAuthState();
    window.location.href = "/login";
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    await clearAuthState();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    window.location.href = "/dashboard";
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    await clearAuthState();
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) {
      window.location.href = "/dashboard";
      return;
    }
    setCheckEmail(true);
  }

  if (checkEmail) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md card p-8 shadow-md text-center">
          <h1 className="text-2xl font-bold text-slate-900">Check your email</h1>
          <p className="mt-3 text-sm text-slate-600">
            We sent a confirmation link to <span className="font-medium text-slate-800">{email}</span>.
            Open it to finish creating your account, then sign in.
          </p>
          <button
            type="button"
            onClick={() => {
              setCheckEmail(false);
              setMode("signin");
              setPassword("");
              setConfirmPassword("");
            }}
            className="btn-primary mt-6 w-full"
          >
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="card p-8 shadow-md">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900">
              {mode === "signin" ? "Sign in to Wiselista" : "Create your account"}
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Property photos, AI-edited. For agents, rental managers and homeowners.
            </p>
          </div>
          {sessionError && (
            <div className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p>Your session may have expired. Please sign in again.</p>
              <button
                type="button"
                onClick={handleClearSession}
                disabled={clearing}
                className="mt-3 text-sm font-medium text-amber-900 underline hover:no-underline disabled:opacity-50"
              >
                {clearing ? "Clearing…" : "Clear session and try again"}
              </button>
            </div>
          )}
          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="mt-8 space-y-5">
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
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="mt-1.5 block w-full rounded-lg border border-wiselista-border bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
              />
            </div>
            {mode === "signup" && (
              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-slate-700">
                  Confirm password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="mt-1.5 block w-full rounded-lg border border-wiselista-border bg-white px-4 py-2.5 text-slate-900 shadow-sm focus:border-wiselista-accent focus:outline-none focus:ring-1 focus:ring-wiselista-accent"
                />
              </div>
            )}
            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading
                ? mode === "signin"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-600">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError(null);
                  }}
                  className="font-medium text-wiselista-accent hover:underline"
                >
                  Create one
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("signin");
                    setError(null);
                  }}
                  className="font-medium text-wiselista-accent hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
          <p className="mt-3 text-center text-sm text-slate-500">
            Prefer a guided pilot?{" "}
            <a
              href="mailto:info@wiselista.com?subject=Wiselista%20pilot%20access"
              className="font-medium text-wiselista-accent hover:underline"
            >
              Email info@wiselista.com
            </a>
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
