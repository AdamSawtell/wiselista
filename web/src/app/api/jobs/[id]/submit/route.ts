import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getApiUser } from "@/lib/api-auth";
import { getStripe, isStripePaymentEnabled, jobPriceCents, stripeProductName } from "@/lib/stripe";
import { isValidPilotPromoCode } from "@/lib/pilot-promo";
import { getPlanConfig } from "@/lib/plans";
import { NextResponse } from "next/server";

/** Claid can take ~20s per photo; allow enough time on serverless. */
export const maxDuration = 300;
export const runtime = "nodejs";

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
    .select("id, status, user_id, plan_tier")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (jobError || !job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "draft" && job.status !== "payment_pending") {
    return NextResponse.json({ error: "Job already submitted" }, { status: 400 });
  }

  const { data: photos } = await supabase
    .from("photos")
    .select("id")
    .eq("job_id", jobId);

  if (!photos?.length) {
    return NextResponse.json({ error: "Add at least one photo" }, { status: 400 });
  }

  const plan = getPlanConfig(job.plan_tier);
  if (photos.length > plan.maxPhotos) {
    return NextResponse.json(
      { error: `${plan.name} allows up to ${plan.maxPhotos} photos. Remove extras or upgrade to Pro.` },
      { status: 400 }
    );
  }

  // Test / pilot: skip Stripe when keys are missing, WISELISTA_SKIP_PAYMENT=true, or valid promo code
  let promoCode: string | undefined;
  try {
    const body = (await request.json()) as { promo_code?: string };
    promoCode = body.promo_code?.trim();
  } catch {
    promoCode = undefined;
  }

  const skipPayment =
    !isStripePaymentEnabled() || isValidPilotPromoCode(promoCode);

  if (skipPayment) {
    const { error: updateError } = await supabase
      .from("jobs")
      .update({ status: "processing", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    console.info("[Submit] payment skipped — dashboard will run processing", {
      jobId,
      userId: user.id,
      photoCount: photos.length,
      promo: promoCode ? "yes" : "env",
    });

    return NextResponse.json({ skippedPayment: true, promoApplied: Boolean(promoCode) });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not available" }, { status: 503 });
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
            unit_amount: jobPriceCents(job.plan_tier),
            product_data: { name: stripeProductName(job.plan_tier) },
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
