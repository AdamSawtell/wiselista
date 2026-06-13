import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { normalizePlanTier, type PlanTier } from "@/lib/plans";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data, error } = await supabase
    .from("jobs")
    .select("id, status, name, created_at, updated_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let name: string | null = null;
  let planTier: PlanTier = "core";
  try {
    const body = await request.json();
    const trimmed = typeof body?.name === "string" ? body.name.trim() : "";
    if (trimmed.length > 120) {
      return NextResponse.json({ error: "Name must be 120 characters or fewer" }, { status: 400 });
    }
    name = trimmed || null;
    planTier = normalizePlanTier(typeof body?.plan_tier === "string" ? body.plan_tier : null);
  } catch {
    // no body — create unnamed project on default Core plan
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data, error } = await supabase
    .from("jobs")
    .insert({ user_id: user.id, status: "draft", name, plan_tier: planTier })
    .select("id, status, name, plan_tier, created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
