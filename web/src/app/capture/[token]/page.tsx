import { notFound } from "next/navigation";
import { CustomerCaptureFlow } from "@/components/CustomerCaptureFlow";
import { loadCaptureSession } from "@/lib/capture";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await loadCaptureSession(token);
  if (!session) return { title: "Property photos — Wiselista" };
  return {
    title: `Photograph ${session.propertyName}`,
    description: `${session.agentName} invited you to capture listing photos — step-by-step, no account needed.`,
  };
}

export default async function CapturePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await loadCaptureSession(token);
  if (!session) notFound();

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-wiselista-accent text-sm font-bold text-white">
          W
        </span>
        <span className="text-sm font-semibold text-slate-900">Wiselista</span>
      </div>
      <CustomerCaptureFlow token={token} initialSession={session} />
      <p className="mx-auto mt-8 max-w-lg text-center text-xs text-slate-400">
        Powered by Wiselista — professional property photos for real estate agents.
      </p>
    </div>
  );
}
