"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { JobStatusFilterValue } from "@/lib/jobs";

const FILTERS: { value: JobStatusFilterValue; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "processing", label: "In progress" },
  { value: "ready", label: "Ready" },
  { value: "failed", label: "Failed" },
];

type Props = {
  counts: Record<JobStatusFilterValue, number>;
};

export function JobStatusFilter({ counts }: Props) {
  const searchParams = useSearchParams();
  const current = (searchParams.get("status") ?? "all") as JobStatusFilterValue;

  return (
    <nav
      className="mb-6 flex gap-1 overflow-x-auto border-b border-slate-200"
      aria-label="Filter projects by status"
    >
      {FILTERS.map(({ value, label }) => {
        const active = current === value;
        const href = value === "all" ? "/dashboard" : `/dashboard?status=${value}`;
        const count = counts[value];

        return (
          <Link
            key={value}
            href={href}
            className={`relative shrink-0 px-3 py-2.5 text-sm transition-colors sm:px-4 ${
              active
                ? "font-medium text-slate-900"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
            {count > 0 && (
              <span
                className={`ml-1.5 tabular-nums ${
                  active ? "text-slate-600" : "text-slate-400"
                }`}
              >
                {count}
              </span>
            )}
            {active && (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-wiselista-accent sm:inset-x-4" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
