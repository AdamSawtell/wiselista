import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { AddPhotoForm } from "@/components/AddPhotoForm";
import { SubmitJobButton } from "@/components/SubmitJobButton";
import { DownloadAllButton } from "@/components/DownloadAllButton";
import { DeleteJobButton } from "@/components/DeleteJobButton";
import { JobNameEditor } from "@/components/JobNameEditor";
import { PhotoGallery } from "@/components/PhotoGallery";
import { getSignedUrlsForPhotos } from "@/lib/storage";
import { formatJobDate } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) redirect("/login");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!job) notFound();

  const { data: photos } = await supabase
    .from("photos")
    .select("id, room_type, sequence, original_key, edited_key")
    .eq("job_id", id)
    .order("sequence");

  const signedUrls = photos?.length
    ? await getSignedUrlsForPhotos(
        photos.map((p) => ({
          id: p.id,
          original_key: p.original_key,
          edited_key: p.edited_key ?? null,
        }))
      )
    : [];

  const galleryPhotos =
    photos?.map((p, i) => ({
      id: p.id,
      room_type: p.room_type,
      originalUrl: signedUrls[i]?.originalUrl ?? null,
      editedUrl: signedUrls[i]?.editedUrl ?? null,
      hasEdited: Boolean(p.edited_key),
    })) ?? [];

  const downloadAllEdited: { filename: string; url: string }[] =
    photos?.length && signedUrls.length === photos.length
      ? signedUrls
          .map((s, i) => ({
            photo: photos[i],
            editedUrl: s.editedUrl,
          }))
          .filter(({ editedUrl }) => editedUrl != null)
          .map(({ photo, editedUrl }) => ({
            filename:
              photo.edited_key?.split("/").pop() ??
              `${photo.room_type}-${photo.sequence}.jpg`,
            url: editedUrl!,
          }))
      : [];

  const isDraft = job.status === "draft";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-wiselista-accent"
      >
        <span aria-hidden>←</span> All projects
      </Link>

      <header className="mt-5 rounded-xl border border-wiselista-border bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <JobNameEditor jobId={id} initialName={job.name ?? null} />
            <p className="mt-2 text-sm text-slate-500">
              Created {formatJobDate(job.created_at)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={job.status} />
            {job.status === "ready" && downloadAllEdited.length > 0 && (
              <DownloadAllButton items={downloadAllEdited} />
            )}
            <DeleteJobButton jobId={id} redirectAfter="/dashboard" />
          </div>
        </div>

        {job.status === "failed" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-800">Enhancement failed</p>
            {(job as { failure_message?: string }).failure_message && (
              <p className="mt-1 text-sm text-red-700">
                {(job as { failure_message?: string }).failure_message}
              </p>
            )}
            <p className="mt-2 text-xs text-red-600">
              Delete this project and try again, or contact support with the project ID.
            </p>
          </div>
        )}
      </header>

      {isDraft && (
        <section className="mt-6 space-y-4">
          <AddPhotoForm jobId={id} />
          <div className="rounded-xl border border-wiselista-border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Ready to enhance?</h2>
            <p className="mt-1 text-sm text-slate-500">
              Submit when you&apos;ve added all the photos you want edited.
            </p>
            <div className="mt-4">
              <SubmitJobButton jobId={id} photoCount={photos?.length ?? 0} />
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Photos
              <span className="ml-2 font-normal text-slate-500">({photos?.length ?? 0})</span>
            </h2>
            {isDraft && (
              <p className="mt-0.5 text-sm text-slate-500">
                Remove any you don&apos;t want before submitting.
              </p>
            )}
          </div>
        </div>
        <PhotoGallery
          jobId={id}
          jobStatus={job.status}
          photos={galleryPhotos}
        />
      </section>
    </div>
  );
}
