import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-11-20.acacia" });

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: jobId } = await params;
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job || job.status !== "draft") {
    return NextResponse.json({ error: "Job not found or not draft" }, { status: 404 });
  }

  const { count } = await supabase.from("photos").select("id", { count: "exact", head: true }).eq("job_id", jobId);
  if (!count || count < 1) {
    return NextResponse.json({ error: "Add at least one photo" }, { status: 400 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "nzd",
          unit_amount: 2900,
          product_data: { name: "Wiselista — Photo edit (this job)" },
        },
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/dashboard/jobs/${jobId}`,
    metadata: { job_id: jobId },
    customer_email: user.email ?? undefined,
  });

  await supabase
    .from("jobs")
    .update({
      status: "payment_pending",
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  return NextResponse.json({ url: session.url });
}
