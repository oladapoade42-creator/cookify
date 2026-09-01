# Cookify — verify-payment: fixed missing CORS handling

1 file: supabase/functions/verify-payment/index.ts

## The bug
"Unexpected end of JSON input" at `req.json()` meant the request body
was empty. This is a classic symptom of a missing CORS preflight
handler: because your browser sends a custom `Authorization` header,
it first sends an OPTIONS request (no body) to check permission before
the real POST. Without an explicit handler for that, the OPTIONS
request fell into the same code as a real request, tried to parse its
(empty) body as JSON, and crashed. Deno Edge Functions don't handle
CORS automatically — every function that's called directly from a
browser needs this wired in by hand.

flutterwave-webhook and check-subscriptions don't need this fix — they're
never called from a browser (Flutterwave's own servers call the webhook,
a cron job calls the subscription sweep), so there's no preflight to
handle there.

## The fix
- Added an explicit OPTIONS handler that responds immediately with the
  right CORS headers.
- Added a small `jsonResponse()` helper so every actual response
  (success or error) also carries those headers — needed on top of the
  OPTIONS handler, or the browser would still block reading the real
  response even after the preflight succeeded.

## Deploy and test
```
supabase functions deploy verify-payment
```
This was very likely the last structural piece — the secret key, the
amount, the env var names, the identity fallback, and now the actual
network-level request/response handling are all sorted. Try it again.
