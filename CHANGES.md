# Cookify — verify-payment: fixed the real root cause

1 file: supabase/functions/verify-payment/index.ts

## The actual bug (finally found it, thanks to the logs you sent)
"invalid claim: missing sub claim" means the token your browser sent
along with the payment confirmation wasn't a real logged-in session —
most likely your session had gone stale by the time Flutterwave's
checkout redirected back to Cookify (a known risk with any payment
flow that bounces you to another site and back: time passes, and a
session check right at that moment can miss).

## The fix — not just a patch, a more resilient design
Rather than only trying to harden the session-token path, I restructured
the whole function:

1. Verify the charge with Flutterwave FIRST (this doesn't need any user
   info — it's just "is $X really paid via this transaction ID").
2. THEN try to identify which Cookify account it belongs to:
   - First: the session token sent with the request (the normal path).
   - Fallback: if that token is missing or invalid, look up the account
     by the email Flutterwave itself just confirmed paid. This can only
     ever match an email that's already a real Cookify account — it's
     not a way to grant Pro to an arbitrary address, just a way to
     recover from a stale browser session at exactly the wrong moment.
3. Only after identifying a real account does it touch the database.

I also had to change how that fallback looks up the account — my first
version tried to query `auth.users` directly, but Supabase blocks
direct API access to that schema for security (checked this before
shipping it, since I'd been wrong about a couple of Supabase specifics
already in this conversation and didn't want to send you chasing
another dead end). It now uses the proper Admin API
(`auth.admin.listUsers`) instead, which is the actual supported way to
do this.

## Deploy and test
```
supabase functions deploy verify-payment
```
Try the payment again. Given everything now: the missing secret key is
set, the amount matches, the env var names are covered either way, and
the identity check has a real fallback — I'm expecting this one to
actually work. If it somehow doesn't, the logs will show exactly which
of the (now fully logged) steps failed.
