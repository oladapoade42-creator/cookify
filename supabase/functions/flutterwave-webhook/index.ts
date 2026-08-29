import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  // 1. Verify the secret webhook password to block unauthorized fake requests
  const flwSignature = req.headers.get("verif-hash");
  if (!flwSignature || flwSignature !== Deno.env.get("FLW_SECRET_HASH")) {
    return new Response("Unauthorized Signature", { status: 401 });
  }

  try {
    const body = await req.json();
    
    // 2. Only look for completed, fully paid transactions
    if (body.event === "charge.completed" && body.data.status === "successful") {
      const txRef = body.data.tx_ref;
      const userEmail = body.data.customer.email;
      
      // Extract the tracking tracking metadata from your frontend payload
      const userId = body.data.meta?.supabase_user_id;
      const tierPurchased = body.data.meta?.tier_purchased || 'pro'; 

      if (!userId) {
        return new Response("Missing User UUID Metadata", { status: 400 });
      }

      // 3. Authenticate with your private administrative security keys
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // 4. Update the user account plan status in your database
      const { error } = await supabaseAdmin
        .from('subscriptions')
        .upsert({
          id: userId,
          email: userEmail,
          tier: tierPurchased,
          flutterwave_ref: txRef,
          flw_customer_id: String(body.data.customer.id),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error("Database update error:", error);
        return new Response("Database Write Failure", { status: 500 });
      }

      return new Response("Subscription Successfully Activated", { status: 200 });
    }

    return new Response("Event ignored", { status: 200 });
  } catch (err) {
    return new Response("Invalid request payload JSON", { status: 400 });
  }
})

