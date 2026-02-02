import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateJobButton } from "@/components/CreateJobButton";
import { RedirectToLogin } from "@/components/RedirectToLogin";

// Dashboard depends on request cookies and Supabase auth.
// Force dynamic rendering so Amplify's static export worker doesn't try
// to pre-render this page at build time.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    let user: { id: string } | null = null;
    let jobs: { id: string; status: string; created_at: string }[] | null = null;
    let jobsError: { message: string } | null = null;

    const supabase = await createClient();
    if (!supabase) return <RedirectToLogin />;

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData?.user) return <RedirectToLogin />;
    user = authData.user;

    const result = await supabase
      .from("jobs")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    jobs = result.data ?? null;
    jobsError = result.error ? { message: result.error.message } : null;

    if (!user) return <RedirectToLogin />;

    return (
    <div className="min-h-full bg-wiselista-surface">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My jobs</h1>
            <p className="mt-1 text-slate-600">
              Create a job, add photos, then submit for AI editing.
            </p>
          </div>
          <CreateJobButton />
        </div>

        {jobsError ? (
          <div className="card p-8 text-center">
            <p className="text-slate-600">Could not load jobs.</p>
            <p className="mt-2 text-sm text-slate-500">
              Check that the <code className="rounded bg-slate-100 px-1">jobs</code> table exists in Supabase (run migrations) and env vars are set in Amplify.
            </p>
          </div>
        ) : (!jobs || jobs.length === 0) ? (
          <div className="card p-12 text-center">
            <p className="text-slate-600">No jobs yet.</p>
            <p className="mt-2 text-sm text-slate-500">
              Click “Create new job” above to start.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/dashboard/jobs/${job.id}`}
                  className="card block p-5 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-sm text-slate-500">
                      {job.id.slice(0, 8)}…
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {new Date(job.created_at).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <span className="mt-2 inline-block text-sm font-medium text-wiselista-accent">
                    View job →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
    );
  } catch (e) {
    console.error("Dashboard load failed:", e);
    return <RedirectToLogin />;
  }
}
