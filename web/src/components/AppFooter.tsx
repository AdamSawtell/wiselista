import Link from "next/link";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-wiselista-border bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 text-xs text-slate-500 sm:px-6">
        <p>© {new Date().getFullYear()} Wiselista</p>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/#how-it-works" className="transition-colors hover:text-wiselista-accent">
            Help
          </Link>
          <Link href="/privacy" className="transition-colors hover:text-wiselista-accent">
            Privacy
          </Link>
          <Link href="/terms" className="transition-colors hover:text-wiselista-accent">
            Terms
          </Link>
          <Link href="/investors" className="transition-colors hover:text-wiselista-accent">
            Investors
          </Link>
          <a
            href="mailto:info@wiselista.com"
            className="transition-colors hover:text-wiselista-accent"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
