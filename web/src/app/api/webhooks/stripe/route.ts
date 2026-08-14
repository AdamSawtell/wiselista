import { createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import type Stripe from "stripe";

/** Stripe only needs a fast 200; processing runs when the agent opens the job page. */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Payment is unavailable" }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[StripeWebhook] signature verification failed", { error: message });
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const jobId = session.metadata?.job_id;
    if (!jobId) {
      console.warn("[StripeWebhook] checkout.session.completed missing job_id metadata");
      return NextResponse.json({ received: true });
    }

    const supabase = createServiceClient();

    const { data: job } = await supabase
      .from("jobs")
      .select("id, status")
      .eq("id", jobId)
      .single();

    if (!job) {
      console.warn("[StripeWebhook] job not found", { jobId });
      return NextResponse.json({ received: true });
    }

    if (job.status === "processing" || job.status === "ready") {
      console.info("[StripeWebhook] job already processing/ready, skipping", {
        jobId,
        status: job.status,
      });
      return NextResponse.json({ received: true });
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : (session.payment_intent?.id ?? null);

    await supabase
      .from("photos")
      .update({
        ai_status: "pending",
        ai_attempts: 0,
        ai_last_error: null,
        ai_claimed_at: null,
      })
      .eq("job_id", jobId)
      .is("edited_key", null);

    const { count: photoCount } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("job_id", jobId);

    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        status: "processing",
        failure_message: null,
        stripe_checkout_session_id: session.id,
        processing_photo_index: 0,
        processing_photo_total: photoCount ?? 0,
        processing_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    if (updateError) {
      console.error("[StripeWebhook] job update failed", { jobId, error: updateError.message });
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const { error: paymentError } = await supabase.from("payments").insert({
      job_id: jobId,
      stripe_payment_intent_id: paymentIntentId,
      amount_cents: session.amount_total ?? 0,
      currency: (session.currency ?? "aud").toUpperCase(),
      status: "succeeded",
    });

    if (paymentError) {
      console.error("[StripeWebhook] payment insert failed", { jobId, error: paymentError.message });
    }

    console.info("[StripeWebhook] payment received — agent dashboard will run processing", {
      jobId,
      sessionId: session.id,
    });
  }

  return NextResponse.json({ received: true });
}
