import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { getJobDisplayName } from "@/lib/jobs";
import { EnhancementSummary } from "@/components/EnhancementSummary";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { ROOM_LABELS } from "@/lib/jobs";
import { getEnhancementSummary } from "@/lib/enhancement";
import { LISTING_TYPE_LABELS } from "@/lib/enhancement";

export const dynamic = "force-dynamic";

const BUCKET = "wiselista-photos";
const SIGNED_EXPIRY = 3600;

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    notFound();
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, name, status, property_address, listing_type, share_token")
    .eq("share_token", token)
    .single();

  if (!job || job.status !== "ready") notFound();

  const { data: photos } = await supabase
    .from("photos")
    .select("id, room_type, sequence, original_key, edited_key")
    .eq("job_id", job.id)
    .not("edited_key", "is", null)
    .order("sequence");

  const signed = await Promise.all(
    (photos ?? []).map(async (p) => {
      const [orig, edit] = await Promise.all([
        supabase.storage.from(BUCKET).createSignedUrl(p.original_key, SIGNED_EXPIRY),
        p.edited_key
          ? supabase.storage.from(BUCKET).createSignedUrl(p.edited_key, SIGNED_EXPIRY)
          : { data: null },
      ]);
      return {
        ...p,
        originalUrl: orig.data?.signedUrl ?? null,
        editedUrl: edit.data?.signedUrl ?? null,
      };
    })
  );

  const displayName = getJobDisplayName(job);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-wiselista-border bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <p className="text-sm font-medium text-wiselista-accent">Wiselista</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{displayName}</h1>
          {job.property_address && (
            <p className="mt-1 text-slate-600">{job.property_address}</p>
          )}
          {job.listing_type && (
            <p className="mt-2 text-sm text-slate-500">
              {LISTING_TYPE_LABELS[job.listing_type as keyof typeof LISTING_TYPE_LABELS]}
            </p>
          )}
          <p className="mt-3 text-sm text-slate-500">
            Enhanced property photos — drag the slider on each image to compare before and after.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-8 sm:px-6">
        <EnhancementSummary photos={photos ?? []} />

        <ul className="space-y-8">
          {signed.map((photo) => {
            const label = ROOM_LABELS[photo.room_type] ?? photo.room_type;
            if (!photo.originalUrl || !photo.editedUrl) return null;
            return (
              <li key={photo.id} className="overflow-hidden rounded-xl border border-wiselista-border bg-white shadow-sm">
                <div className="border-b border-wiselista-border px-4 py-3 font-medium text-slate-900">
                  {photo.sequence}. {label}
                </div>
                <BeforeAfterSlider
                  originalUrl={photo.originalUrl}
                  editedUrl={photo.editedUrl}
                  alt={label}
                />
                <p className="border-t border-wiselista-border px-4 py-3 text-xs text-slate-600">
                  {getEnhancementSummary(photo.room_type)}
                </p>
              </li>
            );
          })}
        </ul>

        <p className="text-center text-xs text-slate-400">
          Powered by Wiselista — property photos, AI-edited.
        </p>
      </main>
    </div>
  );
}
