"use client";

import { useEffect } from "react";
import Link from "next/link";
import { isRedirectError } from "next/dist/client/components/redirect";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (!isRedirectError(error)) {
      console.error("Dashboard error:", error.message, error.digest);
    }
  }, [error]);

  if (isRedirectError(error)) {
    throw error;
  }

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md card p-8 shadow-md text-center">
        <h1 className="text-xl font-bold text-slate-900">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-600">
          We couldn’t load your dashboard. This is often due to a session or database connection issue.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Try signing out and back in, then refresh this page.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="btn-secondary"
          >
            Try again
          </button>
          <Link href="/login" className="btn-primary">
            Sign in again
          </Link>
        </div>
        <Link href="/" className="mt-4 inline-block text-sm text-wiselista-accent hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  );
}
