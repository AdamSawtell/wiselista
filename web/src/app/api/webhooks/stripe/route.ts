import { createServiceClient } from "@/lib/supabase/server";
import { triggerMockAI } from "@/lib/ai-mock";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" });

export async function POST(request: Request) {
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
    return NextResponse.json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const jobId = session.metadata?.job_id;
    if (!jobId) return NextResponse.json({ received: true });

    const supabase = createServiceClient();
    await supabase
      .from("jobs")
      .update({
        status: "processing",
        stripe_checkout_session_id: session.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);

    await supabase.from("payments").insert({
      job_id: jobId,
      stripe_payment_intent_id: session.payment_intent as string,
      amount_cents: (session.amount_total ?? 0),
      currency: (session.currency ?? "nzd").toUpperCase(),
      status: "succeeded",
    });

    await triggerMockAI(jobId);
  }

  return NextResponse.json({ received: true });
}
