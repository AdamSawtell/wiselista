import Link from "next/link";
import { CreateJobForm } from "@/components/CreateJobForm";

export const dynamic = "force-dynamic";

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-wiselista-accent"
      >
        <span aria-hidden>←</span> Projects
      </Link>

      <header className="mt-6 mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">New project</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Name the listing and pick a plan. You can set the property address, shot list, and customer capture
          link on the next screen.
        </p>
      </header>

      <CreateJobForm />
    </div>
  );
}
