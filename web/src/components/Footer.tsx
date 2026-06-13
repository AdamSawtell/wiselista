import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-wiselista-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-wiselista-accent text-xs font-bold text-white">
                W
              </span>
              <span className="text-lg font-bold text-slate-900">Wiselista</span>
            </div>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
              Pro-quality property photos for rental managers, real estate agents, and homeowners.
              Capture, submit, download — listing ready.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Product</h3>
            <nav className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
              <Link href="/#how-it-works" className="transition-colors hover:text-wiselista-accent">
                How it works
              </Link>
              <Link href="/#showcase" className="transition-colors hover:text-wiselista-accent">
                Examples
              </Link>
              <Link href="/#pricing" className="transition-colors hover:text-wiselista-accent">
                Pricing
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Company</h3>
            <nav className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
              <Link href="/investors" className="transition-colors hover:text-wiselista-accent">
                Investors
              </Link>
            </nav>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-900">Account</h3>
            <nav className="mt-3 flex flex-col gap-2 text-sm text-slate-600">
              <Link href="/login" className="transition-colors hover:text-wiselista-accent">
                Sign in
              </Link>
              <Link href="/dashboard" className="transition-colors hover:text-wiselista-accent">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>

        <p className="mt-10 border-t border-wiselista-border pt-6 text-center text-xs text-slate-500 sm:text-left">
          © {new Date().getFullYear()} Wiselista. Property photos, AI-edited.
        </p>
      </div>
    </footer>
  );
}
