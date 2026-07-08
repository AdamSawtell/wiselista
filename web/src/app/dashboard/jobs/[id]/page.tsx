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
import { ShareLinkButton } from "@/components/ShareLinkButton";
import { getSignedUrlsForPhotos } from "@/lib/storage";
import { formatJobDateShort } from "@/lib/jobs";
import { getPlanConfig, normalizePlanTier, planTierLabel } from "@/lib/plans";
import { CustomerCapturePanel } from "@/components/CustomerCapturePanel";
import { JobPlanEditor } from "@/components/JobPlanEditor";
import { JobCaptureBriefPanel } from "@/components/JobCaptureBriefPanel";
import { CaptureBriefProgress } from "@/components/CaptureBriefProgress";
import { JobSetupAccordion } from "@/components/JobSetupAccordion";
import { JobFailedPanel } from "@/components/JobFailedPanel";
import { JobReadyBanner } from "@/components/JobReadyBanner";
import { getPortalLabel, LISTING_TYPE_LABELS } from "@/lib/enhancement";

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
  const isFailed = jobRow.status === "failed";
  const planTier = normalizePlanTier(jobRow.plan_tier);
  const plan = getPlanConfig(planTier);
  const photoCount = photos?.length ?? 0;

  const listingLabel =
    jobRow.listing_type &&
    LISTING_TYPE_LABELS[jobRow.listing_type as keyof typeof LISTING_TYPE_LABELS];
  const portalLabel = getPortalLabel(jobRow.target_portal);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-wiselista-accent"
      >
        <span aria-hidden>←</span> Projects
      </Link>

      <header className="mt-5 border-b border-slate-200 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <JobNameEditor jobId={id} initialName={jobRow.name ?? null} />
            <p className="mt-1.5 text-sm text-slate-500">
              {formatJobDateShort(jobRow.created_at)}
              {jobRow.property_address && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {jobRow.property_address}
                </>
              )}
              {listingLabel && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {listingLabel}
                </>
              )}
              {portalLabel && (
                <>
                  <span className="mx-1.5 text-slate-300">·</span>
                  {portalLabel}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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

        {isFailed && (
          <JobFailedPanel jobId={id} failureMessage={jobRow.failure_message} />
        )}
      </header>

      {isProcessing && (
        <div className="mt-6">
          <ProcessingProgress
            jobId={id}
            photoCount={photos?.length ?? 0}
            initialStatus={jobRow.status}
          />
        </div>
      )}

      {isReady && (
        <div className="mt-6">
          <JobReadyBanner
            photoCount={photoCount}
            targetPortal={jobRow.target_portal ?? null}
            propertyAddress={jobRow.property_address ?? null}
            expiresAt={jobRow.expires_at ?? null}
          />
        </div>
      )}

      <section id="job-photos" className="mt-6">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-base font-medium text-slate-900">
            Photos
            <span className="ml-2 font-normal text-slate-500">
              {photoCount}
              {isDraft ? ` / ${plan.maxPhotos}` : ""}
            </span>
          </h2>
        </div>

        {isDraft && (
          <CaptureBriefProgress
            compact
            captureBrief={jobRow.capture_brief}
            filledSlotIds={photos?.map((p) => p.brief_slot_id) ?? []}
          />
        )}

        <PhotoGallery jobId={id} jobStatus={jobRow.status} photos={galleryPhotos} />
      </section>

      {isDraft && (
        <>
          <div className="mt-6">
            <AddPhotoForm
              jobId={id}
              photoCount={photoCount}
              maxPhotos={plan.maxPhotos}
              planName={plan.name}
              embedded
            />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white px-4 py-4">
            <div>
              <p className="text-sm font-medium text-slate-900">Submit for enhancement</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {photoCount === 0
                  ? "Add at least one photo first"
                  : `${photoCount} photo${photoCount === 1 ? "" : "s"} on ${plan.name}`}
              </p>
            </div>
            <SubmitJobButton jobId={id} photoCount={photoCount} planTier={planTier} />
          </div>

          <JobSetupAccordion>
            <PropertyContextForm
              embedded
              jobId={id}
              initialAddress={jobRow.property_address ?? null}
              initialListingType={jobRow.listing_type ?? null}
              initialPortal={jobRow.target_portal ?? null}
            />
            <JobCaptureBriefPanel
              jobId={id}
              planTier={planTier}
              initialBrief={jobRow.capture_brief}
              editable
            />
            <CustomerCapturePanel
              embedded
              jobId={id}
              planTier={planTier}
              isDraft
              initialEnabled={Boolean(jobRow.capture_enabled)}
              jobName={jobRow.name}
              propertyAddress={jobRow.property_address}
            />
            <JobPlanEditor
              embedded
              jobId={id}
              initialTier={planTier}
              photoCount={photoCount}
              editable
              expiresAt={jobRow.expires_at ?? null}
            />
          </JobSetupAccordion>
        </>
      )}

      {isReady && plan.shareEnabled && (
        <section className="mt-8 border-t border-slate-200 pt-8">
          <h2 className="text-sm font-medium text-slate-900">Share with client</h2>
          <p className="mt-1 text-xs text-slate-500">
            Send a view-only link for vendor or property manager approval.
          </p>
          <div className="mt-3">
            <ShareLinkButton jobId={id} />
          </div>
        </section>
      )}

      {!isDraft && (
        <footer className="mt-10 border-t border-slate-200 pt-6 text-xs text-slate-500">
          {planTierLabel(planTier)} · {photoCount} photo{photoCount === 1 ? "" : "s"}
          {jobRow.expires_at && (
            <> · Available until {formatJobDateShort(jobRow.expires_at)}</>
          )}
          {!plan.shareEnabled && <> · Client share on Pro</>}
        </footer>
      )}
    </div>
  );
}
