// Supabase Edge Function: flutterwave-webhook
// Flutterwave calls this automatically on every recurring monthly charge.
// This is what keeps a subscription alive month to month WITHOUT the user
// re-entering their card — Flutterwave stores the tokenized card and
// charges it on schedule, then tells us the result here.
//
// Set this URL in your Flutterwave dashboard under Settings > Webhooks:
//   https://<your-project-ref>.supabase.co/functions/v1/flutterwave-webhook

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FLW_WEBHOOK_SECRET = Deno.env.get("FLW_WEBHOOK_SECRET")!; // the "secret hash" you set in Flutterwave's dashboard
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
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

    await admin
      .from("subscriptions")
      .update({
        status: "active",
        current_period_end: periodEnd.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("flw_customer_email", email);
  }

  if (event === "subscription.cancelled" || (event === "charge.completed" && data.status === "failed")) {
    await admin
      .from("subscriptions")
      .update({ status: "inactive", updated_at: new Date().toISOString() })
      .eq("flw_customer_email", email);
  }

  return new Response("ok", { status: 200 });
});
