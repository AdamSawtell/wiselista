import Link from "next/link";

// Force dynamic so Amplify static worker doesn't pre-render this (root layout uses cookies).
export const dynamic = "force-dynamic";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-600">The page you’re looking for doesn’t exist.</p>
      <Link href="/" className="btn-primary mt-6">
        Back to home
      </Link>
    </div>
  );
}
