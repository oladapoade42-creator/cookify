# Cookify — E-Restaurant seller-scam mitigation (v1)

3 files: 2 changed (ERestaurant.jsx, Settings.jsx), 1 new migration.

## Run the migration first
`supabase/migrations/20260902_orders.sql` — the `orders` table didn't
have a migration anywhere in this project either (same gap as
comments/food_listings before it). This creates it, with two important
new columns: `buyer_confirmed` and `disputed`.

## The real issue (confirmed by reading the actual payment flow)
Buyers pay sellers directly by bank transfer — Cookify never touches
that money. And only the SELLER could ever set an order's status,
including marking it "Delivered." A dishonest seller could take the
transfer and mark it delivered regardless of what actually happened,
with the buyer having zero say in-app.

## What this v1 fixes
- **Buyers now confirm delivery themselves** — a new "I received this"
  button, separate from the seller's own status field. The order isn't
  silently considered "done" just because the seller says so.
- **"Report a problem" button** on every order, any time — flags it as
  disputed with a reason, visible to you as the admin.
- **A clear warning right where the bank details are shown** — buyers
  now see, in the moment they're about to pay, that Cookify isn't
  processing this payment and they should only pay sellers they trust.
- **Disputes show up in your existing "Needs Review" panel in
  Settings** (same place flagged comments/listings already appear) —
  with a "Suspend seller" button that hides every listing from that
  seller in one click if you confirm a scam.

## What this does NOT fix — the honest limit
This makes the scam harder to get away with and easier for you to catch
and act on, but it doesn't prevent it up front, and Cookify still can't
refund anyone since the money moved outside the app entirely. The real
fix for that is routing payment through Flutterwave with funds held
until the buyer confirms (only released to the seller after that, or
refunded if disputed). That's a genuinely bigger project — it needs
Flutterwave's approval for marketplace/split payments on their end, not
just code here, and changes what Cookify is legally responsible for
holding. Worth doing eventually if E-Restaurant grows, but I didn't
want to build that without you deciding it's the direction you want
first — let me know if/when you want to go there.
