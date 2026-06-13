"use client";

import Link from "next/link";
import { SignOutButton } from "./SignOutButton";
import { CreateJobForm } from "./CreateJobForm";

type DashboardHeaderProps = {
  userEmail?: string | null;
};

export function DashboardHeader({ userEmail }: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-wiselista-border bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-wiselista-accent text-xs font-bold text-white">
              W
            </span>
            <span className="hidden font-semibold text-slate-900 sm:inline">Wiselista</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/dashboard"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
            >
              Projects
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {userEmail && (
            <span className="hidden max-w-[10rem] truncate text-xs text-slate-500 md:inline">
              {userEmail}
            </span>
          )}
          <CreateJobForm compact />
          <SignOutButton className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-800" />
        </div>
      </div>
    </header>
  );
}
