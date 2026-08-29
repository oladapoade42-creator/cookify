// Shared by any Edge Function that needs to alert you (the admin) about
// something that needs attention — a failed payment write, a webhook
// error, expired subscriptions, etc. Uses the same Resend setup as
// send-welcome-email.
//
// Required secrets (set via `supabase secrets set`):
//   RESEND_API_KEY   — same one used by send-welcome-email
//   ADMIN_EMAIL      — where these alerts go (your own inbox)
//   WELCOME_EMAIL_FROM (optional) — reused as the "from" address here too

export async function notifyAdmin(subject: string, message: string) {
  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL");
  const FROM_EMAIL = Deno.env.get("WELCOME_EMAIL_FROM") || "Cookify <onboarding@resend.dev>";

  if (!RESEND_API_KEY || !ADMIN_EMAIL) {
    // Not configured yet — log it so it's at least visible in the
    // function's logs, but never throw. An alerting system that itself
    // crashes the calling function would make things worse, not better.
    console.error("notifyAdmin (not sent — RESEND_API_KEY/ADMIN_EMAIL missing):", subject, message);
    return;
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `[Cookify Admin] ${subject}`,
        html: `<div style="font-family: -apple-system, sans-serif; white-space: pre-wrap;">${message}</div>`,
      }),
    });
  } catch (e) {
    console.error("notifyAdmin: failed to send", e);
  }
}
