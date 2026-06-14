"use client";

import { useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  defaultOpen?: boolean;
};

export function JobSetupAccordion({ children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="mt-10 border-t border-slate-200 pt-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <h2 className="text-sm font-medium text-slate-900">Project setup</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Property details, shot list, customer link, and plan
          </p>
        </div>
        <span className="ml-4 shrink-0 text-sm text-slate-400">{open ? "Hide" : "Show"}</span>
      </button>
      {open && <div className="mt-6 space-y-8">{children}</div>}
    </section>
  );
}
