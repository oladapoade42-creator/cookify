# Cookify — verify-payment now logs every failure path

1 file: supabase/functions/verify-payment/index.ts

Your logs showed the function running (boot -> shutdown) with zero
output, even though it failed — because the auth-failure, verification-
failure, and crash paths never had a console.log/console.error call in
them. Added one to every single branch, including logging Flutterwave's
full verification response. The next attempt will show exactly which
check failed and why (bad secret key, amount mismatch, email mismatch,
whatever it is) instead of a blank log.

Deploy: supabase functions deploy verify-payment
