import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Investors",
  description:
    "Invest in Wiselista — guided capture and AI-edited listing photos for Australian and NZ agencies.",
  alternates: { canonical: "/investors" },
};

export const dynamic = "force-dynamic";

const WHY_INVEST = [
  {
    title: "Large, underserved market",
    body: "Rental and lower-end listings often ship with poor phone photos. Agencies and property managers need pro-quality visuals without booking a photographer for every job.",
  },
  {
    title: "Validated demand",
    body: "Industry leaders in Australia and New Zealand have indicated willingness to pay and pilot with their teams. Rentals and sales both need faster, cheaper listing content.",
  },
  {
    title: "AI makes it viable now",
    body: "Editing quality and cost have reached a point where on-site capture plus AI enhancement can replace many traditional shoots — at a fraction of the price.",
  },
  {
    title: "Simple, repeatable revenue",
            body: "Per-project pricing (Core AUD $29, Pro AUD $49) maps directly to listing volume. No subscription friction — agents pay when they list.",
  },
] as const;

const WHAT_WE_ARE_AFTER = [
  "Capital to run agency and property-management pilots across AU/NZ",
  "Partners who understand proptech, SaaS, or real estate operations",
  "Introductions to rental networks, franchise groups, and portal-adjacent teams",
  "Patient capital as we prove speed-to-rent, listing quality, and unit economics",
] as const;

export default function InvestorsPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-wiselista-border bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-wiselista-accent">
            Investors
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Invest in listing-ready property photos
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Wiselista helps rental managers, agents, and homeowners capture on site and publish
            pro-quality photos — guided capture, AI editing, and a simple per-job model built for
            high-volume listings.
          </p>
          <a
            href="mailto:info@wiselista.com?subject=Wiselista%20investment%20enquiry"
            className="btn-primary mt-8 inline-flex"
          >
            Get in touch
          </a>
          <p className="mt-4 text-sm text-slate-500">
            <a
              href="mailto:info@wiselista.com"
              className="font-medium text-wiselista-accent hover:underline"
            >
              info@wiselista.com
            </a>
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-slate-900">Why invest</h2>
          <p className="mt-3 max-w-2xl text-slate-600">
            Property listings still rely on visuals that are expensive or low quality. Wiselista
            sits at the intersection of mobile capture, AI editing, and agency workflow.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {WHY_INVEST.map((item) => (
              <div key={item.title} className="card p-6">
                <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-wiselista-border bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">What we&apos;re after</h2>
              <p className="mt-3 text-slate-600">
                We&apos;re raising to prove pilots, sharpen the product, and scale with agencies
                that live and die by listing quality and speed.
              </p>
            </div>
            <ul className="card space-y-4 p-6 text-sm text-slate-600">
              {WHAT_WE_ARE_AFTER.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 text-wiselista-accent">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Interested in the round?
          </h2>
          <p className="mt-3 text-slate-600">
            Send a short note — your background, typical cheque size, and why proptech or real
            estate ops interest you. We&apos;ll share deck and pilot data where appropriate.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href="mailto:info@wiselista.com?subject=Wiselista%20investment%20enquiry"
              className="btn-primary w-full sm:w-auto"
            >
              Email info@wiselista.com
            </a>
            <Link href="/" className="btn-secondary w-full sm:w-auto">
              Back to home
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
