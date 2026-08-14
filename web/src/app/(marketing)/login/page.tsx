import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create a Wiselista account to capture and enhance listing photos.",
  alternates: { canonical: "/login" },
};

// Force dynamic so Amplify static worker doesn't pre-render this (layout uses cookies).
export const dynamic = "force-dynamic";

function LoginFormFallback() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md card p-8 shadow-md text-center text-slate-500">
        Loading…
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFormFallback />}>
      <LoginForm />
    </Suspense>
  );
}
