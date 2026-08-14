import type { ReactNode } from "react";

export function LegalDoc({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="bg-white">
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Last updated {updated}</p>
        <div className="legal-prose mt-10 space-y-8 text-sm leading-relaxed text-slate-600 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-slate-900 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:font-medium [&_a]:text-wiselista-accent [&_a]:hover:underline">
          {children}
        </div>
      </div>
    </article>
  );
}
