// Supabase Edge Function: send-welcome-email
// Triggered automatically by a Supabase Database Webhook on INSERT into
// auth.users (configured in the dashboard — see setup notes). Sends a
// welcome email via Resend, but ONLY for accounts created via Google —
// guest sign-ins and other providers are skipped.

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const FROM_EMAIL = Deno.env.get("WELCOME_EMAIL_FROM") || "Cookify <onboarding@resend.dev>";

Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    // Database Webhook payload shape: { type: "INSERT", table: "users", record: {...}, schema: "auth" }
    const user = payload?.record;
    if (!user?.email) return new Response("ok", { status: 200 });

    const provider = user?.raw_app_meta_data?.provider || user?.app_metadata?.provider;
    if (provider !== "google") {
      return new Response("skipped — not a Google sign-up", { status: 200 });
    }

    const firstName = (user.email.split("@")[0] || "there").split(/[._-]/)[0];

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: user.email,
        subject: "Welcome to Cookify 👨‍🍳",
        html: `
          <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #000; color: #fff; border-radius: 16px;">
            <h1 style="font-size: 22px;">Welcome to Cookify, ${firstName}!</h1>
            <p style="color:#ccc; line-height:1.6;">
              You're in. Cookify helps you discover recipes, learn to cook with a real AI tutor
              (with voice guidance), track your cooking streak and XP, and even order food from
              other Cookify Pro+ sellers through E-Restaurant.
            </p>
            <p style="color:#ccc; line-height:1.6;">
              Head back to the app and try the Daily Challenge — three quick food trivia
              questions a day that build your streak and XP.
            </p>
            <p style="color:#888; font-size: 12px; margin-top: 24px;">
              You're receiving this because you signed up for Cookify with Google.
            </p>
          </div>
        `,
      }),
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error("Resend error:", errText);
      return new Response("email failed", { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response("error", { status: 500 });
  }
});
