import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

type HeaderProps = {
  user?: { email?: string } | null;
};

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-wiselista-border bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-wiselista-accent text-sm font-bold text-white">
            W
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold tracking-tight text-slate-900">Wiselista</span>
            <span className="hidden text-xs text-slate-500 sm:block">Property photos, AI-edited</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/#why-wiselista"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Why Wiselista
          </Link>
          <Link
            href="/how-it-works"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            How it works
          </Link>
          <Link
            href="/#showcase"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Examples
          </Link>
          <Link
            href="/#pricing"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <a
                href="/dashboard"
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                Dashboard
              </a>
              <SignOutButton className="text-sm font-medium text-slate-500 hover:text-slate-800" />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:inline-flex"
              >
                Sign in
              </Link>
              <Link href="/login" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
