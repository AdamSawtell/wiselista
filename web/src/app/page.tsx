import Link from "next/link";

export default function Home() {
  return (
    <div className="relative overflow-hidden">
      {/* Hero — property-industry style */}
      <section className="relative bg-wiselista-navy px-4 py-20 sm:px-6 sm:py-28">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(0,102,204,0.15)_0%,transparent_50%)]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Property photos that
            <span className="block text-sky-300">get listings noticed</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-300">
            Capture on your phone, submit for AI editing, get pro-quality photos back in minutes.
            For rental managers, real estate agents & homeowners.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/login" className="btn-primary w-full sm:w-auto">
              Sign in to get started
            </Link>
            <Link href="/dashboard" className="btn-secondary w-full sm:w-auto text-white border-white/30 bg-white/5 hover:bg-white/10">
              Go to dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* How it works — strip */}
      <section className="border-b border-wiselista-border bg-wiselista-card py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-center text-2xl font-semibold text-slate-900">
            How it works
          </h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-wiselista-accent/10 text-wiselista-accent font-bold">
                1
              </div>
              <h3 className="mt-3 font-medium text-slate-900">Capture</h3>
              <p className="mt-1 text-sm text-slate-600">
                Take photos by room with guided framing and tips.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-wiselista-accent/10 text-wiselista-accent font-bold">
                2
              </div>
              <h3 className="mt-3 font-medium text-slate-900">Submit & pay</h3>
              <p className="mt-1 text-sm text-slate-600">
                Send for AI editing. Secure payment, then we process.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-wiselista-accent/10 text-wiselista-accent font-bold">
                3
              </div>
              <h3 className="mt-3 font-medium text-slate-900">Download</h3>
              <p className="mt-1 text-sm text-slate-600">
                Get edited photos in minutes. Use them in your listings.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-wiselista-surface px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Ready to list with better photos?
          </h2>
          <p className="mt-2 text-slate-600">
            Sign in or create an account to start your first job.
          </p>
          <Link href="/login" className="btn-primary mt-6 inline-flex">
            Sign in
          </Link>
        </div>
      </section>
    </div>
  );
}
