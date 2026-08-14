"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Use when we must redirect without throwing (e.g. from catch block where redirect() would be caught by error boundary). */
export function RedirectToLogin({ errorParam }: { errorParam?: string } = {}) {
  const router = useRouter();
  const href = errorParam ? `/login?error=${errorParam}` : "/login";
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 text-slate-600">
      Redirecting to sign in…
    </div>
  );
}
