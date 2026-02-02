import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { AddPhotoForm } from "@/components/AddPhotoForm";
import { SubmitJobButton } from "@/components/SubmitJobButton";
import { DownloadAllButton } from "@/components/DownloadAllButton";
import { getSignedUrlsForPhotos } from "@/lib/storage";

// Job details rely on request cookies and Supabase auth.
// Mark as dynamic to avoid static export attempts in Amplify.
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

  const roomLabel: Record<string, string> = {
    living_room: "Living room",
    kitchen: "Kitchen",
    bedroom: "Bedroom",
    bathroom: "Bathroom",
    exterior: "Exterior",
    other: "Other",
  };

  return (
    <div className="min-h-full bg-wiselista-surface">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center text-sm font-medium text-wiselista-accent hover:underline"
        >
          ← Back to dashboard
        </Link>

        <div className="mt-6 card p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Job {id.slice(0, 8)}</h1>
              <p className="mt-1 text-sm text-slate-500">
                Created {new Date(job.created_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </p>
            </div>
            <StatusBadge status={job.status} />
          </div>
        </div>

        {job.status === "draft" && (
          <section className="mt-8">
            <AddPhotoForm jobId={id} />
            <div className="mt-6">
              <SubmitJobButton jobId={id} photoCount={photos?.length ?? 0} />
            </div>
          </section>
        )}

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-slate-900">
              Photos ({photos?.length ?? 0})
            </h2>
            {job.status === "ready" && downloadAllEdited.length > 0 && (
              <DownloadAllButton items={downloadAllEdited} />
            )}
          </div>
          <ul className="mt-4 space-y-4">
            {(!photos || photos.length === 0) ? (
              <li className="card p-6 text-center text-slate-500">
                No photos in this job yet.
              </li>
            ) : (
              photos.map((p, i) => {
                const urls = signedUrls[i];
                return (
                  <li key={p.id} className="card p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium text-slate-800">
                        {roomLabel[p.room_type] ?? p.room_type}
                      </span>
                      {p.edited_key ? (
                        <span className="badge-ready">Edited</span>
                      ) : (
                        <span className="badge-draft">Pending</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4">
                      {urls?.originalUrl && (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-medium text-slate-500">
                            Original
                          </p>
                          <a
                            href={urls.originalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-24 overflow-hidden rounded border border-wiselista-border bg-slate-100"
                          >
                            <img
                              src={urls.originalUrl}
                              alt={`${roomLabel[p.room_type] ?? p.room_type} original`}
                              className="h-24 w-24 object-cover"
                            />
                          </a>
                          <a
                            href={urls.originalUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-wiselista-accent hover:underline"
                          >
                            Download original
                          </a>
                        </div>
                      )}
                      {urls?.editedUrl && (
                        <div className="flex flex-col gap-1">
                          <p className="text-xs font-medium text-slate-500">
                            Edited
                          </p>
                          <a
                            href={urls.editedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-24 overflow-hidden rounded border border-wiselista-border bg-slate-100"
                          >
                            <img
                              src={urls.editedUrl}
                              alt={`${roomLabel[p.room_type] ?? p.room_type} edited`}
                              className="h-24 w-24 object-cover"
                            />
                          </a>
                          <a
                            href={urls.editedUrl}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-wiselista-accent hover:underline"
                          >
                            Download edited
                          </a>
                        </div>
                      )}
                      {!urls?.originalUrl && !urls?.editedUrl && (
                        <p className="font-mono text-xs text-slate-500">
                          {p.original_key}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
