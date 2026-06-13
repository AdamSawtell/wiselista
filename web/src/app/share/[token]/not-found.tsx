import Link from "next/link";

export default function ShareNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-xl border border-wiselista-border bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-wiselista-accent">Wiselista</p>
        <h1 className="mt-2 text-xl font-bold text-slate-900">Link not found</h1>
        <p className="mt-3 text-sm text-slate-600">
          This share link may have expired, or the photos are not ready yet. Ask your agent to send a
          new link once the property shoot is complete.
        </p>
        <Link href="/" className="btn-primary mt-6 inline-flex">
          Go to Wiselista
        </Link>
      </div>
    </div>
  );
}
