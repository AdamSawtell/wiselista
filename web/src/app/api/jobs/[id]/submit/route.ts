import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { triggerMockAI } from "@/lib/ai-mock";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const supabase = token
    ? createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      )
    : await createClient();

  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job, error: jobError } = await supabase
    .from("jobs")
    .select("id, status, user_id")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "draft") return NextResponse.json({ error: "Job already submitted" }, { status: 400 });

  const { data: photos } = await supabase
    .from("photos")
    .select("id")
    .eq("job_id", jobId);

  if (!photos?.length) return NextResponse.json({ error: "Add at least one photo" }, { status: 400 });

  const { error: updateError } = await supabase
    .from("jobs")
    .update({ status: "processing", updated_at: new Date().toISOString() })
    .eq("id", jobId);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  triggerMockAI(jobId);

  return NextResponse.json({ ok: true, message: "Job submitted for editing" });
}
