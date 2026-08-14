import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { JobCard } from "@/components/JobCard";
import { JobStatusFilter } from "@/components/JobStatusFilter";
import { getSignedUrlsForPhotos } from "@/lib/storage";
import {
  countJobsByStatus,
  matchesStatusFilter,
  type JobStatusFilterValue,
} from "@/lib/jobs";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  status: string;
  name: string | null;
  created_at: string;
  photos: { id: string; room_type: string; original_key: string; edited_key: string | null }[];
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: statusParam } = await searchParams;
  const statusFilter = (statusParam ?? "all") as JobStatusFilterValue;

  const supabase = await createClient();
  if (!supabase) redirect("/login");

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) redirect("/login");
  const user = authData.user;

  const result = await supabase
    .from("jobs")
    .select("id, status, name, created_at, photos(id, room_type, original_key, edited_key)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const allJobs = (result.data ?? null) as JobRow[] | null;
  const jobsError = result.error ? { message: result.error.message } : null;
  const counts = countJobsByStatus(allJobs ?? []);
  const jobs = (allJobs ?? []).filter((job) => matchesStatusFilter(job.status, statusFilter));

  const cards = await Promise.all(
    jobs.map(async (job) => {
      const photos = job.photos ?? [];
      const previewPhotos = photos.slice(0, 1);
      const signed = previewPhotos.length
        ? await getSignedUrlsForPhotos(
            previewPhotos.map((p) => ({
              id: p.id,
              original_key: p.original_key,
              edited_key: p.edited_key,
            })),
            supabase
          )
        : [];

      return {
        job: {
          id: job.id,
          status: job.status,
          name: job.name,
          created_at: job.created_at,
          photoCount: photos.length,
        },
        previews: previewPhotos.map((p, i) => ({
          url: signed[i]?.editedUrl ?? signed[i]?.originalUrl ?? null,
          roomType: p.room_type,
        })),
      };
    })
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Projects</h1>
          <p className="mt-1 text-sm text-slate-500">
            {counts.all === 0
              ? "Your property listings will appear here."
              : `${counts.all} listing${counts.all === 1 ? "" : "s"}`}
            {counts.ready > 0 && (
              <span>
                {" "}
                · {counts.ready} ready to download
              </span>
            )}
          </p>
        </div>
        <Link href="/dashboard/new" className="btn-primary shrink-0">
          New project
        </Link>
      </header>

      {counts.all > 0 && (
        <Suspense fallback={<div className="mb-6 h-10 border-b border-slate-200" />}>
          <JobStatusFilter counts={counts} />
        </Suspense>
      )}

      {jobsError ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-700">Could not load projects.</p>
          <p className="mt-2 text-sm text-slate-500">Try refreshing the page.</p>
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          {counts.all === 0 ? (
            <>
              <p className="text-base font-medium text-slate-800">No projects yet</p>
              <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
                Create a project for each listing. Add photos yourself or send a link for your customer to
                capture on their phone.
              </p>
              <Link href="/dashboard/new" className="btn-primary mt-6 inline-flex">
                Create your first project
              </Link>
            </>
          ) : (
            <>
              <p className="font-medium text-slate-800">Nothing in this view</p>
              <p className="mt-2 text-sm text-slate-500">Try another filter or create a new project.</p>
              <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-wiselista-accent hover:underline">
                Show all projects
              </Link>
            </>
          )}
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-slate-200 bg-white divide-y divide-slate-100">
          {cards.map(({ job, previews }) => (
            <JobCard key={job.id} job={job} previews={previews} />
          ))}
        </ul>
      )}
    </div>
  );
}
