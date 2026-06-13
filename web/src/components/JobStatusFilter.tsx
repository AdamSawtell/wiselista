"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "processing", label: "Processing" },
  { value: "ready", label: "Ready" },
  { value: "failed", label: "Failed" },
] as const;

export function JobStatusFilter() {
  const searchParams = useSearchParams();
  const current = searchParams.get("status") ?? "all";

  return (
    <div className="flex flex-wrap gap-2">
      {FILTERS.map(({ value, label }) => {
        const active = current === value;
        const href = value === "all" ? "/dashboard" : `/dashboard?status=${value}`;
        return (
          <Link
            key={value}
            href={href}
            className={
              active
                ? "rounded-full bg-wiselista-accent px-3.5 py-1.5 text-sm font-medium text-white"
                : "rounded-full border border-wiselista-border bg-white px-3.5 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            }
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
