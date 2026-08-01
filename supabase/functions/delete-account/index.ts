// Supabase Edge Function: delete-account
// Called from Settings > Remove Profile. Verifies the caller's own JWT,
// then deletes all of their data plus their actual auth account — using
// the service role key, which never touches the browser.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Browsers send a CORS preflight (OPTIONS) before the real POST because this
// request carries an Authorization header and comes from a different origin
// (your Vercel app) than the Supabase function. Without these headers the
// browser blocks the request before it ever reaches the code below — which
// is why "Remove Profile" looked like it was doing nothing.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace("Bearer ", "");

    const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ success: false, error: "Not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Clean up owned rows first (in case cascade isn't set up on every table).
    await admin.from("likes").delete().eq("user_id", userId);
    await admin.from("comments").delete().eq("provider", userId); // no-op if comments key by provider only
    await admin.from("orders").delete().or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
    await admin.from("food_listings").delete().eq("seller_id", userId);
    await admin.from("subscriptions").delete().eq("user_id", userId);
    await admin.from("profiles").delete().eq("user_id", userId);

    // Finally, delete the actual auth account.
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
