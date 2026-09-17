# Cookify — full database rebuild script + clean supabase.js

2 files: `supabase/COOKIFY_FULL_SETUP.sql` (new), `src/supabase.js`
(overwrite).

## If your Supabase project had an issue
Run `COOKIFY_FULL_SETUP.sql` — SQL Editor → New query → paste the
**entire file** → Run. It covers every table, policy, and storage
bucket built across this whole project (profiles, dish_stats,
subscriptions, comments, likes, food_listings, orders, plus the
food-listings storage bucket) in the correct dependency order.

It's written to be safe no matter what state things are in:
- If a table is missing, it gets created.
- If a table exists but is missing a column (e.g. an old `comments`
  table without `text`/`username`/`flagged`), the column gets added.
- Every policy is dropped and recreated fresh, so stale/broken policies
  from a partial setup get fixed automatically instead of erroring out.
- Ends with a schema-cache reload, so there's no separate step needed
  after running it.

You can run this whole file again in the future too, any time — it's
meant to be safely re-runnable, not a one-time script.

## supabase.js
Removed the stray `flutterwavePublicKey` constant that had been added
directly into this file — it didn't belong there (Flutterwave's key
belongs in `UpgradeButton.jsx`, read from the environment) and wasn't
being used by anything, but it's cleaner without it. Everything else in
the file was already correct and is unchanged.

## For testing via Android Studio specifically
This file reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` from
your **local** `.env` file at build time — there's no way to make this
"just work" purely in code, since these values get permanently baked
into the app the moment you build it. To be certain the native app has
the right values:
1. Double check your local `.env` has the current, correct
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (copy fresh from
   Supabase Dashboard → Settings → API if in doubt).
2. `npm run build && npx cap sync android`
3. In Android Studio: uninstall the old app from your
   device/emulator, clean rebuild, fresh install.

Skipping step 3 is the single most common reason a fix "doesn't seem to
work" — an old already-installed build never picks up new environment
variable values no matter what changes in the code.
