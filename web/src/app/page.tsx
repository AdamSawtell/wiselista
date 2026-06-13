import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

const SHOWCASE = [
  {
    title: "Bright living room",
    suburb: "Ponsonby, Auckland",
    before: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80",
    after: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
    tag: "AI enhanced",
  },
  {
    title: "Modern kitchen",
    suburb: "Richmond, Melbourne",
    before: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=800&q=80",
    after: "https://images.unsplash.com/photo-1600489000022-0f1a8d7c51d5?w=800&q=80",
    tag: "HDR + colour",
  },
  {
    title: "Street appeal",
    suburb: "Paddington, Sydney",
    before: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
    after: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
    tag: "Exterior polish",
  },
] as const;

const AUDIENCES = ["Agents", "Rentals", "Homeowners"] as const;

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero — REA-style image + action panel */}
      <section className="relative min-h-[520px] lg:min-h-[600px]">
        <Image
          src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80"
          alt="Modern property exterior"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/75 via-slate-900/55 to-slate-900/30" />

        <div className="relative mx-auto flex max-w-7xl flex-col justify-center px-4 py-16 sm:px-6 lg:min-h-[600px] lg:px-8 lg:py-24">
          <div className="max-w-2xl text-white">
            <p className="text-sm font-semibold uppercase tracking-wider text-sky-200">
              Built for Australian &amp; NZ property professionals
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Listing photos that
              <span className="block">sell the property</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-slate-200">
              Capture on your phone, submit for AI editing, and download pro-quality images in
              minutes — ready for realestate.com.au, Domain, and your agency portal.
            </p>
          </div>

          {/* Action panel — inspired by REA search card */}
          <div className="mt-10 w-full max-w-3xl rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5 sm:p-3">
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
              {AUDIENCES.map((label, i) => (
                <span
                  key={label}
                  className={`flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-semibold ${
                    i === 0
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500"
                  }`}
                >
                  {label}
                </span>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-3 p-2 sm:flex-row sm:items-center">
              <div className="flex-1 rounded-xl border border-wiselista-border bg-slate-50 px-4 py-3.5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Your next listing
                </p>
                <p className="mt-0.5 text-base font-medium text-slate-800">
                  Upload photos by room — get edited results back in ~15 minutes
                </p>
              </div>
              <Link
                href="/login"
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-wiselista-accent px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-wiselista-accent-hover"
              >
                Start a job
              </Link>
            </div>
            <p className="px-2 pb-1 pt-2 text-center text-xs text-slate-500">
              From AUD $29 per job · Secure Stripe payment · No subscription
            </p>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-b border-wiselista-border bg-slate-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4 sm:px-6 lg:px-8">
          {[
            { value: "~15 min", label: "Typical turnaround" },
            { value: "AUD $29", label: "Per job, all photos" },
            { value: "6 rooms", label: "Guided capture types" },
            { value: "AI + HDR", label: "Pro enhancement" },
          ].map((stat) => (
            <div key={stat.label} className="text-center sm:text-left">
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Before / after showcase — REA listing card style */}
      <section id="showcase" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">See the difference</h2>
              <p className="mt-2 max-w-xl text-slate-600">
                Phone photos transformed for listings — brighter, sharper, and ready to publish.
              </p>
            </div>
            <Link href="/login" className="text-sm font-semibold text-wiselista-accent hover:underline">
              Try with your own photos →
            </Link>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {SHOWCASE.map((item) => (
              <article key={item.title} className="listing-card group overflow-hidden">
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
                  <Image
                    src={item.after}
                    alt={`${item.title} — edited`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 100vw, 33vw"
                  />
                  <span className="absolute left-3 top-3 rounded-md bg-wiselista-accent px-2.5 py-1 text-xs font-semibold text-white">
                    {item.tag}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 flex">
                    <div className="relative h-16 flex-1 overflow-hidden border-r border-white/20">
                      <Image
                        src={item.before}
                        alt={`${item.title} — before`}
                        fill
                        className="object-cover opacity-90"
                        sizes="200px"
                      />
                      <span className="absolute bottom-1 left-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Before
                      </span>
                    </div>
                    <div className="relative h-16 flex-1 overflow-hidden">
                      <Image
                        src={item.after}
                        alt={`${item.title} — after`}
                        fill
                        className="object-cover"
                        sizes="200px"
                      />
                      <span className="absolute bottom-1 left-2 rounded bg-wiselista-accent px-1.5 py-0.5 text-[10px] font-medium text-white">
                        After
                      </span>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-slate-900">{item.title}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">{item.suburb}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-wiselista-border bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-3xl font-bold text-slate-900">How it works</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Three steps from phone capture to listing-ready photos — the same flow agents use every day.
          </p>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                step: "1",
                title: "Capture by room",
                body: "Open the app, pick the room type, and shoot with guided framing and tips — like a pocket stylist on site.",
              },
              {
                step: "2",
                title: "Submit & pay",
                body: "Review your batch, remove any duds, then pay securely via Stripe. We start AI processing immediately.",
              },
              {
                step: "3",
                title: "Download & list",
                body: "Edited photos land in your dashboard in minutes. Download individually or as a batch for your CRM or portal.",
              },
            ].map((item) => (
              <div key={item.step} className="card p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-wiselista-accent text-sm font-bold text-white">
                  {item.step}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-bold text-slate-900">Simple, per-job pricing</h2>
            <p className="mt-3 text-slate-600">
              No subscriptions. Pay once per batch — whether it&apos;s a rental turnaround or a full sale listing.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-md">
            <div className="card overflow-hidden">
              <div className="bg-wiselista-navy px-6 py-8 text-center text-white">
                <p className="text-sm font-medium uppercase tracking-wide text-sky-200">Per job</p>
                <p className="mt-2 text-5xl font-bold">
                  $29
                  <span className="text-lg font-medium text-slate-300"> AUD</span>
                </p>
                <p className="mt-2 text-sm text-slate-300">All photos in the job · Unlimited rooms</p>
              </div>
              <ul className="space-y-3 px-6 py-6 text-sm text-slate-600">
                {[
                  "AI enhancement (HDR, colour, sharpness)",
                  "Room-type specific processing",
                  "Dashboard download when ready",
                  "Works on web and mobile",
                ].map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="mt-0.5 text-wiselista-accent">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="border-t border-wiselista-border px-6 py-5">
                <Link href="/login" className="btn-primary w-full">
                  Get started
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-wiselista-navy py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Ready to list with better photos?
          </h2>
          <p className="mt-3 text-slate-300">
            Join rental managers and agents who shoot on site and publish the same afternoon.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login" className="btn-primary w-full sm:w-auto">
              Sign in to get started
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
