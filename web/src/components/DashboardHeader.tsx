"use client";

import Link from "next/link";
import { SignOutButton } from "./SignOutButton";

type DashboardHeaderProps = {
  userEmail?: string | null;
};

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-wiselista-navy text-xs font-bold text-white">
              W
            </span>
            <span className="hidden font-semibold text-slate-900 sm:inline">Wiselista</span>
          </Link>
          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-800"
            >
              Projects
            </Link>
            <Link
              href="/dashboard/account"
              className="text-sm text-slate-500 transition-colors hover:text-slate-800"
            >
              Account
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {userEmail && (
            <span className="hidden max-w-[11rem] truncate text-xs text-slate-400 md:inline">
              {userEmail}
            </span>
          )}
          <Link href="/dashboard/new" className="btn-primary px-4 py-2 text-sm">
            New project
          </Link>
          <SignOutButton className="hidden text-sm text-slate-500 transition-colors hover:text-slate-800 sm:inline" />
        </div>
      </div>
    </header>
  );
}
