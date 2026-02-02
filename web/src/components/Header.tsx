import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

type HeaderProps = {
  user?: { email?: string } | null;
};

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-wiselista-border bg-wiselista-navy shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">Wiselista</span>
          <span className="hidden text-sm font-normal text-slate-300 sm:inline">
            Property photos, done right
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              {/* Full page link so dashboard request sends cookies; client-side Link can miss cookies on some hosts */}
              <a
                href="/dashboard"
                className="text-sm font-medium text-white/90 transition-colors hover:text-white"
              >
                Dashboard
              </a>
              <SignOutButton className="text-sm font-medium text-white/70 hover:text-white" />
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
