"use client";

import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

export function DashboardHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-wiselista-border bg-wiselista-navy shadow-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight text-white">Wiselista</span>
          <span className="hidden text-sm font-normal text-slate-300 sm:inline">
            Dashboard
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-white/90 transition-colors hover:text-white"
          >
            My jobs
          </Link>
          <SignOutButton className="text-sm font-medium text-white/70 transition-colors hover:text-white" />
        </nav>
      </div>
    </header>
  );
}
