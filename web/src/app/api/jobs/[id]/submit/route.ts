import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { getStripe, JOB_PRICE_CENTS } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getApiUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json(
      { error: "Payment not configured. Add STRIPE_SECRET_KEY to enable submit." },
      { status: 503 }
    );
  }

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
  if (job.status !== "draft") {
    return NextResponse.json({ error: "Job already submitted" }, { status: 400 });
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id")
    .eq("job_id", jobId);

  if (!photos?.length) {
    return NextResponse.json({ error: "Add at least one photo" }, { status: 400 });
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: JOB_PRICE_CENTS,
            product_data: { name: "Wiselista — Photo edit (this job)" },
          },
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/dashboard/jobs/${jobId}?paid=1`,
      cancel_url: `${appUrl}/dashboard/jobs/${jobId}`,
      metadata: { job_id: jobId, user_id: user.id },
      customer_email: user.email ?? undefined,
    });

    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        status: "payment_pending",
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    console.info("[Submit] checkout session created", {
      jobId,
      userId: user.id,
      sessionId: session.id,
      photoCount: photos.length,
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Stripe error";
    console.error("[Submit] Stripe checkout failed", { jobId, error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
