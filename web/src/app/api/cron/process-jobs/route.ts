import { createServiceClient, getServiceClientOrNull } from "@/lib/supabase/server";
import { listJobsNeedingProcessing } from "@/lib/photo-ai-queue";
import { runJobProcessing } from "@/lib/trigger-job-processing";
import { NextResponse } from "next/server";

export const maxDuration = 300;
export const runtime = "nodejs";

/**
 * Server-side pump: process one photo for each job that still needs AI work.
 * Auth: Authorization: Bearer <CRON_SECRET>
 *
 * Called by GitHub Actions every minute so enhancement continues without an open tab.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getServiceClientOrNull() ?? createServiceClient();
  const jobIds = await listJobsNeedingProcessing(db, 5);

  if (!jobIds.length) {
    return NextResponse.json({ ok: true, processed: 0, remainingJobs: 0, results: [] });
  }

  const results: Array<{
    jobId: string;
    status?: string;
    photoId?: string;
    ok: boolean;
    error?: string;
  }> = [];

  // One photo per job per tick — stays under Amplify timeouts.
  for (const jobId of jobIds) {
    const result = await runJobProcessing(jobId, db);
    results.push({
      jobId,
      status: result.status,
      photoId: result.photoId,
      ok: result.ok,
      error: result.error,
    });
  }

  const still = await listJobsNeedingProcessing(db, 50);

  console.info("[CronProcessJobs]", {
    processed: results.length,
    remainingJobs: still.length,
    results,
  });

  return NextResponse.json({
    ok: true,
    processed: results.length,
    remainingJobs: still.length,
    results,
  });
}

/** GET for quick health from ops (still requires secret). */
export async function GET(request: Request) {
  return POST(request);
}
