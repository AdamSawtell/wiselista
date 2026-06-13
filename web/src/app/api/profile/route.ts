import { createClientForRequest } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import {
  type AgentProfileInput,
  normalizeBusinessUrl,
  validateProfileInput,
} from "@/lib/profile";
import { NextResponse } from "next/server";

function sanitizeInput(body: AgentProfileInput): AgentProfileInput {
  return {
    full_name: body.full_name?.trim() ?? "",
    business_name: body.business_name?.trim() ?? "",
    role_title: body.role_title?.trim() || null,
    phone: body.phone?.trim() || null,
    business_url: normalizeBusinessUrl(body.business_url),
    business_address: body.business_address?.trim() || null,
  };
}

export async function GET(request: Request) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (!data) {
    return NextResponse.json({
      profile: {
        id: user.id,
        full_name: "",
        business_name: "",
        role_title: null,
        phone: null,
        business_url: null,
        business_address: null,
      },
    });
  }

  return NextResponse.json({ profile: data });
}

export async function PATCH(request: Request) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClientForRequest(request);
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  let body: AgentProfileInput;
  try {
    body = (await request.json()) as AgentProfileInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const input = sanitizeInput(body);
  const validationError = validateProfileInput(input);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        ...input,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    )
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ profile: data });
}
