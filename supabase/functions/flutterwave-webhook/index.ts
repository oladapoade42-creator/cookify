// Supabase Edge Function: flutterwave-webhook
// Flutterwave calls this automatically on every recurring monthly charge.
// This is what keeps a subscription alive month to month WITHOUT the user
// re-entering their card — Flutterwave stores the tokenized card and
// charges it on schedule, then tells us the result here.
//
// Set this URL in your Flutterwave dashboard under Settings > Webhooks:
//   https://<your-project-ref>.supabase.co/functions/v1/flutterwave-webhook

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyAdmin } from "../_shared/notifyAdmin.ts";

// Accepts either name — FLW_WEBHOOK_SECRET is what this file originally
// expected, FLW_SECRET_HASH is what Flutterwave itself calls this value
// in its own dashboard (Settings > Webhooks > Secret Hash), so either
// works without you needing to rename anything you've already set.
const FLW_WEBHOOK_SECRET = Deno.env.get("FLW_WEBHOOK_SECRET") || Deno.env.get("FLW_SECRET_HASH")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEYS")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("WELCOME_EMAIL_FROM") || "Cookify <onboarding@resend.dev>";

async function emailUser(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
  } catch (e) {
    console.error("flutterwave-webhook: emailUser failed", e);
  }
}

Deno.serve(async (req: Request) => {
  const signature = req.headers.get("verif-hash");
  if (!signature || signature !== FLW_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = await req.json();
  const event = payload?.event;
  const data = payload?.data;
  const email = data?.customer?.email;
  if (!email) return new Response("ok", { status: 200 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (event === "charge.completed" && data.status === "successful") {
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { error } = await admin
      .from("subscriptions")
      .update({
        status: "active",
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("flw_customer_email", email);

    if (error) {
      console.error("flutterwave-webhook: renewal update failed", error);
      await notifyAdmin(
        "Renewal charge succeeded but DB update failed",
        `${email}'s renewal charge succeeded on Flutterwave, but updating their subscription row failed:\n${JSON.stringify(error)}`
      );
    }
  }

  if (event === "subscription.cancelled" || (event === "charge.completed" && data.status === "failed")) {
    const { error } = await admin
      .from("subscriptions")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("flw_customer_email", email);

    if (error) {
      console.error("flutterwave-webhook: cancellation update failed", error);
      await notifyAdmin(
        "Subscription cancellation/failed-charge DB update failed",
        `${email}'s subscription needed to be marked inactive (event: ${event}), but the update failed:\n${JSON.stringify(error)}`
      );
    } else if (event === "charge.completed" && data.status === "failed") {
      await emailUser(
        email,
        "Your Cookify payment didn't go through",
        `<div style="font-family: -apple-system, sans-serif;"><p>Your latest Cookify subscription charge failed, so your Pro access has been paused. Update your payment method and resubscribe from the app to pick up where you left off.</p></div>`
      );
    }
  }

  return new Response("ok", { status: 200 });
});
