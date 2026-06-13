import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateJobForm } from "@/components/CreateJobForm";
import { JobCard } from "@/components/JobCard";
import { JobStatusFilter } from "@/components/JobStatusFilter";
import { getSignedUrlsForPhotos } from "@/lib/storage";

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
  const { status: statusFilter } = await searchParams;
  const supabase = await createClient();
  if (!supabase) redirect("/login?error=session");

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData?.user) redirect("/login?error=session");
  const user = authData.user;

  let query = supabase
    .from("jobs")
    .select("id, status, name, created_at, photos(id, room_type, original_key, edited_key)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (statusFilter && statusFilter !== "all") {
    if (statusFilter === "processing") {
      query = query.in("status", ["submitted", "payment_pending", "processing"]);
    } else {
      query = query.eq("status", statusFilter);
    }
  }

  const result = await query;
  const jobs = (result.data ?? null) as JobRow[] | null;
  const jobsError = result.error ? { message: result.error.message } : null;

  const cards = await Promise.all(
    (jobs ?? []).map(async (job) => {
      const photos = job.photos ?? [];
      const previewPhotos = photos.slice(0, 4);
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
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Your projects
        </h1>
        <p className="mt-2 max-w-xl text-slate-600">
          Create a project, add property photos, and submit for AI editing. Everything in one place.
        </p>
      </div>

      <div className="mb-8">
        <CreateJobForm />
      </div>

      <Suspense fallback={<div className="mb-6 h-9" />}>
        <div className="mb-6">
          <JobStatusFilter />
        </div>
      </Suspense>

      {jobsError ? (
        <div className="rounded-xl border border-wiselista-border bg-white p-8 text-center shadow-sm">
          <p className="text-slate-600">Could not load projects.</p>
          <p className="mt-2 text-sm text-slate-500">
            Check that the jobs table exists in Supabase and env vars are set in Amplify.
          </p>
        </div>
      ) : cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="font-medium text-slate-700">
            {statusFilter && statusFilter !== "all"
              ? "No projects match this filter."
              : "No projects yet."}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Create your first project above to start adding photos.
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map(({ job, previews }) => (
            <JobCard key={job.id} job={job} previews={previews} />
          ))}
        </ul>
      )}
    </div>
  );
}
