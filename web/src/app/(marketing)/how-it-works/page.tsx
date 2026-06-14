import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "How Wiselista works",
  description:
    "Create a listing project, send a magic link to your vendor or tenant, and get AI-enhanced photos ready for Domain and realestate.com.au.",
};

const STORYBOARD_STEPS = [
  {
    step: 1,
    caption: "Need listing photos but don't want to organise a photographer every time?",
  },
  {
    step: 2,
    caption:
      "With Wiselista, simply create a property project and send a magic link to your vendor or tenant.",
  },
  {
    step: 3,
    caption: "They walk room by room, taking photos on their phone with helpful guidance.",
  },
  {
    step: 4,
    caption: "No app, no login.",
  },
  {
    step: 5,
    caption: "The photos come straight back to you. Submit them for AI enhancement.",
  },
  {
    step: 6,
    caption:
      "Download bright, listing-ready images and upload them to Domain or realestate.com.au.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="bg-white">
      <section className="border-b border-wiselista-border bg-slate-50 py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-wider text-wiselista-accent">
            How it works
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            From phone to listing-ready in six steps
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-600">
            Send a link, your vendor or tenant shoots guided room photos on their phone, and you
            download AI-enhanced images for your portal — no photographer booking required.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-xl ring-1 ring-black/5">
            <div className="border-b border-slate-700 bg-slate-900 px-4 py-3 text-center sm:px-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
                Wiselista — property photos, AI-edited
              </p>
            </div>
            <Image
              src="/images/how-it-works-storyboard.png"
              alt="Wiselista storyboard: agent creates a project and sends a magic link; vendor photographs rooms on their phone with guidance; photos return for AI enhancement; agent downloads listing-ready images for Domain and realestate.com.au."
              width={1920}
              height={1080}
              className="h-auto w-full"
              priority
            />
          </div>
          <p className="mt-4 text-center text-sm text-slate-500">
            Pro plan — send a capture link to your vendor or tenant. You can also shoot yourself on
            web or mobile.
          </p>
        </div>
      </section>

      <section className="border-y border-wiselista-border bg-slate-50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900 sm:text-3xl">The flow</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-slate-600">
            Same story as the explainer above — in order, if you prefer to read step by step.
          </p>

          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STORYBOARD_STEPS.map((item) => (
              <li
                key={item.step}
                className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-100 bg-wiselista-navy px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-wiselista-accent text-sm font-bold text-white">
                    {item.step}
                  </span>
                </div>
                <p className="flex flex-1 items-center bg-slate-800 px-4 py-5 text-sm leading-relaxed text-slate-100">
                  {item.caption}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-slate-900">Two ways to capture</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="card p-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-wiselista-accent">
                You shoot
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Agent or property manager</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Use the dashboard on desktop or{" "}
                <a
                  href="https://mobile.wiselista.com"
                  className="font-medium text-wiselista-accent hover:underline"
                >
                  mobile.wiselista.com
                </a>{" "}
                on site. Guided room-by-room capture, then submit for enhancement.
              </p>
            </div>
            <div className="card border-wiselista-accent/20 p-6 ring-1 ring-wiselista-accent/10">
              <p className="text-sm font-semibold uppercase tracking-wide text-wiselista-accent">
                They shoot · Pro
              </p>
              <h3 className="mt-2 text-lg font-semibold text-slate-900">Vendor or tenant</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Create a project, send the magic link by email or SMS. They photograph each room on
                their phone — no app install, no login — and photos land in your dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-wiselista-border bg-wiselista-navy py-14">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-wiselista-accent text-lg font-bold text-white">
            W
          </div>
          <p className="mt-4 text-lg font-medium text-white">Property photos, AI-edited.</p>
          <p className="mt-2 text-sm text-slate-300">Core from $29 AUD · Pro from $49 AUD · No subscription</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login" className="btn-primary w-full sm:w-auto">
              Get started
            </Link>
            <Link
              href="/#pricing"
              className="inline-flex w-full items-center justify-center rounded-lg border border-white/30 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/10 sm:w-auto"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
