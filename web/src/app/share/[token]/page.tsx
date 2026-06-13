import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientShareGallery } from "@/components/ClientShareGallery";
import { ShareAgentCard } from "@/components/ShareAgentCard";
import { getSharePageData } from "@/lib/share";
import { formatJobDate } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSharePageData(token);
  if (!data) {
    return { title: "Property photos — Wiselista" };
  }
  return {
    title: `${data.propertyName} — Property photos`,
    description: `Listing-ready photos prepared by ${data.agent.name}. View enhanced property images shared via Wiselista.`,
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getSharePageData(token);

  if (!data) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-wiselista-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-wiselista-accent text-sm font-bold text-white">
              W
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900">Wiselista</p>
              <p className="text-xs text-slate-500">Property photos for your review</p>
            </div>
          </div>
          <Link
            href="/"
            className="hidden text-sm font-medium text-wiselista-accent hover:underline sm:inline"
          >
            About Wiselista
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <section className="overflow-hidden rounded-2xl border border-wiselista-border bg-white shadow-sm">
          <div className="border-b border-wiselista-border bg-wiselista-navy px-6 py-8 text-white sm:px-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-200">Property</p>
            <h1 className="mt-2 text-2xl font-bold text-white sm:text-3xl">{data.propertyName}</h1>
            {data.propertyAddress && (
              <p className="mt-2 text-base text-slate-200">{data.propertyAddress}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {data.listingTypeLabel && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
                  {data.listingTypeLabel}
                </span>
              )}
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-100">
                {data.photos.length} enhanced photo{data.photos.length === 1 ? "" : "s"}
              </span>
            </div>
          </div>

          <ShareAgentCard
            agent={data.agent}
            completedAt={data.completedAt}
            completedLabel={
              data.completedAt ? `Photos ready ${formatJobDate(data.completedAt)}` : undefined
            }
          />

          <div className="px-6 py-6 sm:px-8">
            <p className="text-sm leading-relaxed text-slate-600">
              Your agent has shared listing-ready property photos enhanced with Wiselista — professional
              HDR, colour, and sharpness tuned for rental and sales portals. Tap any image to view
              full size.
            </p>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">Photos</h2>
          <p className="mt-1 text-sm text-slate-500">
            Enhanced images for this property. Room labels match how they appear on listing sites.
          </p>
          <div className="mt-5">
            <ClientShareGallery photos={data.photos} />
          </div>
        </section>

        <section className="mt-10 rounded-xl border border-wiselista-border bg-white px-6 py-6 sm:px-8">
          <h2 className="text-base font-semibold text-slate-900">About Wiselista</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Wiselista helps real estate agents and property managers shoot on site and deliver
            polished listing photos the same day. Photos are AI-enhanced for brightness, colour, and
            clarity — ready for realestate.com.au, Domain, and your CRM.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex text-sm font-medium text-wiselista-accent hover:underline"
          >
            Learn more at wiselista.com
          </Link>
        </section>

        <p className="mt-8 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} Wiselista. Shared property gallery — view only.
        </p>
      </main>
    </div>
  );
}
