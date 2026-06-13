import { randomBytes } from "crypto";
import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { NextResponse } from "next/server";

/** Create or return a view-only share link for client approval. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: job, error: fetchError } = await supabase
    .from("jobs")
    .select("id, status, share_token")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "ready") {
    return NextResponse.json({ error: "Share links are available when photos are ready" }, { status: 400 });
  }

  let token = job.share_token as string | null;
  if (!token) {
    token = randomBytes(24).toString("hex");
    const { error: updateError } = await supabase
      .from("jobs")
      .update({ share_token: token, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return NextResponse.json({ url: `${appUrl}/share/${token}` });
}
