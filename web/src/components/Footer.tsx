import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-wiselista-border bg-wiselista-card mt-auto">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Wiselista</span>
            <span className="text-sm text-slate-500">— Property photos, AI-edited</span>
          </div>
          <nav className="flex gap-6 text-sm text-slate-600">
            <Link href="/" className="transition-colors hover:text-wiselista-accent">
              Home
            </Link>
            <Link href="/login" className="transition-colors hover:text-wiselista-accent">
              Sign in
            </Link>
            <Link href="/dashboard" className="transition-colors hover:text-wiselista-accent">
              Dashboard
            </Link>
          </nav>
        </div>
        <p className="mt-6 text-center text-xs text-slate-500 sm:text-left">
          For rental property managers, real estate agents & homeowners. Capture, submit, get pro-quality photos back in minutes.
        </p>
      </div>
    </footer>
  );
}
