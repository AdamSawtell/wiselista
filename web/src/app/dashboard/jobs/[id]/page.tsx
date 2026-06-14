import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { StatusBadge } from "@/components/StatusBadge";
import { AddPhotoForm } from "@/components/AddPhotoForm";
import { SubmitJobButton } from "@/components/SubmitJobButton";
import { DownloadAllButton } from "@/components/DownloadAllButton";
import { DownloadZipButton } from "@/components/DownloadZipButton";
import { DeleteJobButton } from "@/components/DeleteJobButton";
import { JobNameEditor } from "@/components/JobNameEditor";
import { PhotoGallery } from "@/components/PhotoGallery";
import { PropertyContextForm } from "@/components/PropertyContextForm";
import { ProcessingProgress } from "@/components/ProcessingProgress";
import { EnhancementSummary } from "@/components/EnhancementSummary";
import { ListingReadyChecklist } from "@/components/ListingReadyChecklist";
import { TimeSavedCallout } from "@/components/TimeSavedCallout";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { getSignedUrlsForPhotos } from "@/lib/storage";
import { formatJobDate } from "@/lib/jobs";
import { getPlanConfig, normalizePlanTier } from "@/lib/plans";
import { CustomerCapturePanel } from "@/components/CustomerCapturePanel";
import { JobPlanEditor } from "@/components/JobPlanEditor";
import { JobCaptureBriefPanel } from "@/components/JobCaptureBriefPanel";
import { CaptureBriefProgress } from "@/components/CaptureBriefProgress";
import { LISTING_TYPE_LABELS } from "@/lib/enhancement";

export const dynamic = "force-dynamic";

type JobRow = {
  id: string;
  status: string;
  name: string | null;
  created_at: string;
  completed_at: string | null;
  failure_message?: string | null;
  property_address?: string | null;
  listing_type?: string | null;
  target_portal?: string | null;
  processing_started_at?: string | null;
  plan_tier?: string | null;
  expires_at?: string | null;
  capture_enabled?: boolean | null;
  capture_status?: string | null;
  capture_brief?: unknown;
};

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

  const jobRow = job as JobRow;

  const { data: photos } = await supabase
    .from("photos")
    .select("id, room_type, sequence, original_key, edited_key, brief_slot_id")
    .eq("job_id", id)
    .order("sequence");

  const signedUrls = photos?.length
    ? await getSignedUrlsForPhotos(
        photos.map((p) => ({
          id: p.id,
          original_key: p.original_key,
          edited_key: p.edited_key ?? null,
        })),
        supabase
      )
    : [];

  const galleryPhotos =
    photos?.map((p, i) => ({
      id: p.id,
      room_type: p.room_type,
      sequence: p.sequence,
      originalUrl: signedUrls[i]?.originalUrl ?? null,
      editedUrl: signedUrls[i]?.editedUrl ?? null,
      hasEdited: Boolean(p.edited_key),
    })) ?? [];

  const editedCount = galleryPhotos.filter((p) => p.hasEdited).length;

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

  const isDraft = jobRow.status === "draft";
  const isReady = jobRow.status === "ready";
  const isProcessing = jobRow.status === "processing";
  const planTier = normalizePlanTier(jobRow.plan_tier);
  const plan = getPlanConfig(planTier);
  const photoCount = photos?.length ?? 0;

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
            <JobNameEditor jobId={id} initialName={jobRow.name ?? null} />
            <p className="mt-2 text-sm text-slate-500">
              Created {formatJobDate(jobRow.created_at)}
              {jobRow.property_address && (
                <span className="ml-2 text-slate-600">· {jobRow.property_address}</span>
              )}
              {jobRow.listing_type && (
                <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {LISTING_TYPE_LABELS[jobRow.listing_type as keyof typeof LISTING_TYPE_LABELS] ??
                    jobRow.listing_type}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={jobRow.status} />
            {isReady && downloadAllEdited.length > 0 && (
              <>
                <DownloadZipButton jobId={id} photoCount={downloadAllEdited.length} />
                <DownloadAllButton items={downloadAllEdited} />
              </>
            )}
            <DeleteJobButton jobId={id} redirectAfter="/dashboard" />
          </div>
        </div>

        {jobRow.status === "failed" && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="font-medium text-red-800">Enhancement failed</p>
            {jobRow.failure_message && (
              <p className="mt-1 text-sm text-red-700">{jobRow.failure_message}</p>
            )}
            <p className="mt-2 text-xs text-red-600">
              Delete this project and try again, or contact support with the project ID.
            </p>
          </div>
        )}
      </header>

      {isProcessing && (
        <ProcessingProgress
          jobId={id}
          photoCount={photos?.length ?? 0}
          initialStatus={jobRow.status}
        />
      )}

      {isReady && (
        <div className="mt-6 space-y-6">
          <TimeSavedCallout
            photoCount={photos?.length ?? 0}
            processingStartedAt={jobRow.processing_started_at ?? null}
            completedAt={jobRow.completed_at}
          />
          <ListingReadyChecklist
            photoCount={photos?.length ?? 0}
            editedCount={editedCount}
            targetPortal={jobRow.target_portal ?? null}
            propertyAddress={jobRow.property_address ?? null}
          />
          <EnhancementSummary photos={photos ?? []} />
          {plan.shareEnabled ? (
            <section className="rounded-xl border border-wiselista-border bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Share with your client</h2>
              <p className="mt-1 text-sm text-slate-500">
                Send a view-only link so vendors or property managers can approve before you list.
              </p>
              <div className="mt-4">
                <ShareLinkButton jobId={id} />
              </div>
            </section>
          ) : (
            <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <h2 className="font-semibold text-slate-900">Share with your client</h2>
              <p className="mt-1 text-sm text-slate-600">
                Client share links are included on Wiselista Pro. This project is on Core — upgrade before
                submitting your next listing to unlock share.
              </p>
            </section>
          )}
        </div>
      )}

      <div className="mt-6">
        <PropertyContextForm
          jobId={id}
          initialAddress={jobRow.property_address ?? null}
          initialListingType={jobRow.listing_type ?? null}
          initialPortal={jobRow.target_portal ?? null}
        />
      </div>

      <div className="mt-6">
        <JobCaptureBriefPanel
          jobId={id}
          planTier={planTier}
          initialBrief={jobRow.capture_brief}
          editable={isDraft}
        />
      </div>

      {isDraft && (
        <div className="mt-6">
          <CaptureBriefProgress
            captureBrief={jobRow.capture_brief}
            filledSlotIds={photos?.map((p) => p.brief_slot_id) ?? []}
          />
        </div>
      )}

      <div className="mt-6">
        <CustomerCapturePanel
          jobId={id}
          planTier={planTier}
          isDraft={isDraft}
          initialEnabled={Boolean(jobRow.capture_enabled)}
          jobName={jobRow.name}
          propertyAddress={jobRow.property_address}
        />
      </div>

      <div className="mt-6">
        <JobPlanEditor
          jobId={id}
          initialTier={planTier}
          photoCount={photoCount}
          editable={isDraft}
          expiresAt={jobRow.expires_at ?? null}
        />
      </div>

      {isDraft && (
        <section className="mt-6 space-y-4">
          <AddPhotoForm jobId={id} photoCount={photoCount} maxPhotos={plan.maxPhotos} planName={plan.name} />
          <div className="rounded-xl border border-wiselista-border bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Ready to enhance?</h2>
            <p className="mt-1 text-sm text-slate-500">
              Submit when you&apos;ve added all the photos you want edited ({photoCount} / {plan.maxPhotos}{" "}
              on {plan.name}).
            </p>
            <div className="mt-4">
              <SubmitJobButton jobId={id} photoCount={photoCount} planTier={planTier} />
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Photos
              <span className="ml-2 font-normal text-slate-500">
                ({photoCount}
                {isDraft ? ` / ${plan.maxPhotos}` : ""})
              </span>
            </h2>
            {isDraft && (
              <p className="mt-0.5 text-sm text-slate-500">
                Remove any you don&apos;t want before submitting.
              </p>
            )}
          </div>
        </div>
        <PhotoGallery jobId={id} jobStatus={jobRow.status} photos={galleryPhotos} />
      </section>
    </div>
  );
}
