# Cookify — automations batch (emails, moderation, admin alerts, subscription upkeep, Where to Buy)

10 files: 6 changed (overwrite), 4 new. This is a big batch — read
through the setup steps below before it'll actually do anything, since
most of these need secrets/dashboard config on your end.

## 1. Run the new migration
`supabase/migrations/20260829_content_tables.sql` — creates `comments`,
`likes`, and `food_listings` tables (none of these existed yet; every
place that used them already had a silent "table not set up" fallback),
plus `flagged`/`flag_reason` columns for moderation.

## 2. Set these Supabase secrets
```
supabase secrets set RESEND_API_KEY=your_resend_key
supabase secrets set ADMIN_EMAIL=your_own_email@example.com
supabase secrets set WELCOME_EMAIL_FROM="Cookify <onboarding@resend.dev>"
```
(`RESEND_API_KEY` may already be set if send-welcome-email works — reuse
the same one. `ADMIN_EMAIL` is new — that's where alerts go.)

## 3. Add your admin email to the frontend too
In your `.env` (and your hosting provider's environment variables):
```
VITE_ADMIN_EMAIL=your_own_email@example.com
```
This must be the email on the Google account you use to log into
Cookify — it's what unlocks the flagged-content review panel in
Settings (only visible to you, nobody else sees it).

## 4. Deploy the edge functions
```
supabase functions deploy verify-payment
supabase functions deploy flutterwave-webhook
supabase functions deploy check-subscriptions
```

## 5. Schedule check-subscriptions to run daily
Supabase Dashboard → Edge Functions → check-subscriptions → there's a
Cron tab where you can set a schedule directly (e.g. `0 6 * * *` for
6am UTC daily). This is the subscription-upkeep piece — a safety net
that downgrades anyone whose subscription period ended without a
renewal webhook ever coming through (missed webhooks happen; this
catches it instead of leaving stale "active" subscriptions forever).

## What each piece does

**Automated emails** — `verify-payment` now sends a receipt on a
successful subscription; `flutterwave-webhook` emails a user if their
renewal charge fails; `check-subscriptions` emails anyone it downgrades.
All reuse the same Resend setup as your existing welcome email.

**Content moderation** — `src/utils/moderation.js` runs a quick Gemini
check on comments (RecipeCard.jsx) and E-Restaurant listings
(ERestaurant.jsx) before they post. Flagged content still saves (nothing
is ever silently deleted) but stays hidden from public view until you
approve it. This is a best-effort filter using the same client-side
pattern the rest of the app's AI features already use — not a hard
security wall, but it catches the obvious spam/inappropriate stuff
without you having to read every single post.

**Review panel** — Settings now has a "Needs Review" section (visible
only to you, via the admin email check) listing anything flagged, with
Approve/Delete buttons.

**Admin alerts** — `supabase/functions/_shared/notifyAdmin.ts` is a
shared helper other functions call to email you when something needs
attention: a payment that verified but failed to save, a renewal DB
update that failed, or the daily subscription sweep results.

**Subscription upkeep** — `check-subscriptions` (new function, see
setup above) is the actual automation here — once scheduled, it runs
itself daily without you doing anything.

## Where to Buy (separate feature, same batch)
Added to `RecipeCard.jsx` — a new button under "Watch on YouTube" in
the expanded recipe view. Tapping it searches `food_listings` for
E-Restaurant sellers whose listing title loosely matches the dish name,
and shows each one with a "Directions" link (opens Google Maps to their
listed address) — no paid Maps API needed, reuses the same
directions-link pattern already in ERestaurant.jsx.

One real limitation worth knowing: this only finds matches among dishes
people have actually listed for sale on E-Restaurant. For a brand new
app with few sellers, it'll often come back empty — that's expected,
not a bug, and it says so plainly ("No Cookify sellers currently list
this dish") rather than pretending real-world restaurant data exists
somewhere it doesn't.

## Still to come
The visual redesign (cleaner layout, same color scheme) is a separate,
sizeable piece of work — didn't want to rush a shallow pass onto the end
of this already-large batch. Say the word and I'll start on it next.
