// Supabase Edge Function: verify-payment
// Called by the frontend right after a Flutterwave checkout succeeds.
// This is the ONLY place that grants Cookify Pro — it re-checks the
// transaction against Flutterwave's servers using the secret key, which
// never touches the browser. A client can never fake this.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FLW_SECRET_KEY = Deno.env.get("FLW_SECRET_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");

    // Identify the calling user from their Supabase session token.
    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), { status: 401 });
    }
    const user = userData.user;

    const { transaction_id, tier: requestedTier } = await req.json();
    if (!transaction_id) {
      return new Response(JSON.stringify({ success: false, error: "Missing transaction_id" }), { status: 400 });
    }
    const tier = requestedTier === "pro_plus" ? "pro_plus" : "pro";
    const expectedAmount = tier === "pro_plus" ? 20 : 2;

    // Verify the transaction directly with Flutterwave — the only source of truth.
    const flwRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );
    const flwData = await flwRes.json();

    const tx = flwData?.data;
    const isValid =
      flwData?.status === "success" &&
      tx?.status === "successful" &&
      tx?.currency === "USD" &&
      tx?.amount >= expectedAmount &&
      tx?.customer?.email?.toLowerCase() === user.email?.toLowerCase();

    if (!isValid) {
      return new Response(JSON.stringify({ success: false, error: "Transaction could not be verified" }), { status: 400 });
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await adminClient.from("subscriptions").upsert({
      user_id: user.id,
      status: "active",
      tier,
      flw_customer_email: tx.customer.email,
      flw_tx_ref: tx.tx_ref,
      current_period_end: periodEnd.toISOString(),
      updated_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), { status: 500 });
  }
});
