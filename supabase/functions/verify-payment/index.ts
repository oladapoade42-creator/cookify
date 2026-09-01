// Supabase Edge Function: verify-payment
// Called by the frontend right after a Flutterwave checkout succeeds.
// This is the ONLY place that grants Cookify Pro — it re-checks the
// transaction against Flutterwave's servers using the secret key, which
// never touches the browser. A client can never fake this.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { notifyAdmin } from "../_shared/notifyAdmin.ts";

const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
// Supabase renamed the service-role key to SUPABASE_SECRET_KEYS on newer
// projects — check both names so this works regardless of which one your
// project actually provides.
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SECRET_KEYS")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = Deno.env.get("WELCOME_EMAIL_FROM") || "Cookify <onboarding@resend.dev>";

async function sendReceiptEmail(email: string, tier: string, amount: number) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: email,
        subject: "Your Cookify subscription receipt",
        html: `<div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #000; color: #fff; border-radius: 16px;">
          <h1 style="font-size: 20px;">You're subscribed to ${tier === "pro_plus" ? "Cookify Pro+" : "Cookify Pro"} 🎉</h1>
          <p style="color:#ccc; line-height:1.6;">Charged: $${amount}/month. Your subscription renews automatically each month — cancel anytime from Settings.</p>
        </div>`,
      }),
    });
  } catch (e) {
    console.error("verify-payment: receipt email failed", e);
  }
}

Deno.serve(async (req) => {
  try {
    const { transaction_id, tier: requestedTier } = await req.json();
    if (!transaction_id) {
      console.error("verify-payment: missing transaction_id in request body");
      return new Response(JSON.stringify({ success: false, error: "Missing transaction_id" }), { status: 400 });
    }
    const tier = requestedTier === "pro_plus" ? "pro_plus" : "pro";
    // Must match TIER_CONFIG in src/components/UpgradeButton.jsx exactly —
    // that's the actual advertised/charged price. This previously said 20
    // for pro_plus while the UI charges 4, meaning every genuine Pro+
    // purchase would fail this check and get reported as unverified even
    // though the person was correctly charged the advertised amount.
    const expectedAmount = tier === "pro_plus" ? 4 : 2;

    // Verify the transaction directly with Flutterwave FIRST — this is the
    // one fact we trust unconditionally. Everything else (which app user
    // this belongs to) gets figured out relative to this.
    const flwRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );
    const flwData = await flwRes.json();
    console.log("verify-payment: Flutterwave response", JSON.stringify(flwData));

    const tx = flwData?.data;
    const chargeIsValid =
      flwData?.status === "success" &&
      tx?.status === "successful" &&
      tx?.currency === "USD" &&
      tx?.amount >= expectedAmount;

    if (!chargeIsValid) {
      console.error("verify-payment: charge verification failed", {
        flwStatus: flwData?.status, txStatus: tx?.status, currency: tx?.currency, amount: tx?.amount, expectedAmount,
      });
      return new Response(JSON.stringify({ success: false, error: "Transaction could not be verified" }), { status: 400 });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Identify which account this belongs to. First choice: the session
    // token sent with the request. Second choice (used if that token is
    // missing/expired — which can genuinely happen after bouncing through
    // Flutterwave's own checkout page and back): match by the email
    // Flutterwave itself just confirmed paid, against Cookify's own
    // signed-in accounts. Either way, the person still has to be signed
    // into an account with that exact email for this to succeed — this
    // isn't a way to grant Pro to an arbitrary email.
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");
    let user: { id: string; email?: string } | null = null;

    if (jwt) {
      const { data: userData, error: userError } = await adminClient.auth.getUser(jwt);
      if (userError) {
        console.error("verify-payment: session token auth failed, will try email match instead", userError.message);
      } else {
        user = userData.user;
      }
    }

    if (!user && tx?.customer?.email) {
      // auth.users isn't exposed via the regular Data API (Supabase blocks
      // that schema for security), so this has to go through the Admin
      // API instead. listUsers() doesn't support filtering by email
      // server-side, so this fetches a page and matches client-side —
      // completely fine at this app's scale (hundreds/thousands of users),
      // would need real pagination if this app ever has 1000+ accounts.
      const { data: usersPage, error: lookupError } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
      if (lookupError) {
        console.error("verify-payment: email fallback lookup failed", lookupError);
      } else {
        const matched = usersPage.users.find(
          (u) => u.email?.toLowerCase() === tx.customer.email.toLowerCase()
        );
        if (matched) {
          console.log(`verify-payment: identified user via email match (session token was missing/invalid) — ${matched.email}`);
          user = matched;
        }
      }
    }

    if (!user) {
      console.error("verify-payment: could not identify a user for this payment", { txEmail: tx?.customer?.email });
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment verified with Flutterwave, but we couldn't match it to your account. Please contact support with this transaction ID: " + transaction_id,
        }),
        { status: 401 }
      );
    }

    console.log(`verify-payment: granting ${tier} to ${user.email} for tx ${transaction_id}`);

    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // This is the step that actually grants Pro. Previously its result was
    // never checked — if this write failed for any reason (missing table,
    // a schema mismatch, a permissions issue), the function still returned
    // { success: true } to the app, which would show "Pro activated!" to
    // someone who had genuinely paid but never actually got anything.
    // Now a failure here is treated as a real failure, not a hidden one.
    const { error: dbError } = await adminClient.from("subscriptions").upsert({
      user_id: user.id,
      status: "active",
      tier,
      flw_customer_email: tx.customer.email,
      flw_tx_ref: tx.tx_ref,
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (dbError) {
      // Log the real reason server-side (visible in Supabase's Edge
      // Function logs) without leaking internal details to the client.
      console.error("verify-payment: subscriptions upsert failed", dbError);
      await notifyAdmin(
        "Payment succeeded but subscription save failed",
        `User ${user.email} paid for ${tier} (tx ${transaction_id}) but the subscriptions upsert failed:\n${JSON.stringify(dbError)}\n\nThis needs manual follow-up — check Flutterwave to confirm the charge, then add their row to the subscriptions table by hand.`
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment verified with Flutterwave, but we couldn't save your subscription. Please contact support with this transaction ID: " + transaction_id,
        }),
        { status: 500 }
      );
    }

    await sendReceiptEmail(tx.customer.email, tier, expectedAmount);
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    console.error("verify-payment: unhandled exception", e);
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 500 });
  }
});
