// Supabase Edge Function: check-subscriptions
// A safety net behind flutterwave-webhook. Webhooks can be missed (a
// network blip, a retry limit reached, Flutterwave's servers having an
// issue) — if that happens, someone's subscription would stay "active"
// in your database forever even though it was never actually renewed.
// This sweeps for exactly that case once a day.
//
// This does NOT charge anyone or talk to Flutterwave — it only looks at
// dates already in your own subscriptions table. Real renewal charges
// still come from Flutterwave's own recurring billing + the webhook;
// this just cleans up subscriptions whose period already ended without
// ever being renewed.
//
// Set this to run daily via Supabase's Cron Triggers (Dashboard ->
// Edge Functions -> check-subscriptions -> Cron, schedule: "0 6 * * *"
// for 6am UTC daily) — see supabase/config.toml for a declarative
// alternative.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyAdmin } from "../_shared/notifyAdmin.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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
    console.error("check-subscriptions: emailUser failed", e);
  }
}

Deno.serve(async (_req: Request) => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  const { data: expired, error } = await admin
    .from("subscriptions")
    .select("user_id, tier, flw_customer_email")
    .eq("status", "active")
    .lt("current_period_end", new Date().toISOString());

  if (error) {
    console.error("check-subscriptions: query failed", error);
    await notifyAdmin("check-subscriptions sweep failed", `Query failed: ${JSON.stringify(error)}`);
    return new Response("error", { status: 500 });
  }

  if (!expired || expired.length === 0) {
    return new Response(JSON.stringify({ checked: 0, downgraded: 0 }), { status: 200 });
  }

  const ids = expired.map((s) => s.user_id);
  const { error: updateError } = await admin
    .from("subscriptions")
    .update({ status: "inactive", updated_at: new Date().toISOString() })
    .in("user_id", ids);

  if (updateError) {
    console.error("check-subscriptions: downgrade update failed", updateError);
    await notifyAdmin("check-subscriptions downgrade failed", `${expired.length} expired subscriptions found, but the downgrade update failed:\n${JSON.stringify(updateError)}`);
    return new Response("error", { status: 500 });
  }

  for (const sub of expired) {
    if (sub.flw_customer_email) {
      await emailUser(
        sub.flw_customer_email,
        "Your Cookify subscription has lapsed",
        `<div style="font-family: -apple-system, sans-serif;"><p>Your ${sub.tier === "pro_plus" ? "Cookify Pro+" : "Cookify Pro"} subscription period ended and we didn't see a renewal go through. Your Pro features are paused — resubscribe anytime from the app to pick back up.</p></div>`
      );
    }
  }

  await notifyAdmin(
    "Daily subscription sweep",
    `Downgraded ${expired.length} lapsed subscription(s):\n${expired.map((s) => `- ${s.flw_customer_email} (${s.tier})`).join("\n")}`
  );

  return new Response(JSON.stringify({ checked: expired.length, downgraded: expired.length }), { status: 200 });
});
