"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Use when we must redirect without throwing (e.g. from catch block where redirect() would be caught by error boundary). */
export function RedirectToLogin({ errorParam = "session" }: { errorParam?: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(`/login?error=${errorParam}`);
  }, [router, errorParam]);
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12 text-slate-600">
      Redirecting to sign in…
    </div>
  );
}
