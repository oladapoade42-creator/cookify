# Cookify — webhook could wipe an active subscription from a stale event

1 file: supabase/functions/flutterwave-webhook/index.ts

## The bug
The "mark inactive" branch matched purely by email — no check on
whether the incoming failed/cancelled event was even about the CURRENT
subscription. During all our earlier debugging, several real payment
attempts genuinely failed at Flutterwave's end before the one that
worked. If Flutterwave redelivered/retried a webhook for one of those
old failed attempts after your successful payment was already recorded,
this code would have matched it by email and flipped your active
subscription back to inactive — completely unrelated to your actual,
paid-for subscription.

## The fix
Before downgrading anything, the function now checks the event's own
timestamp against `updated_at` on the subscription row. If the event is
older than the last time the row was touched, it's treated as a stale
replay and ignored (logged, but no downgrade). A genuinely new
cancellation or failed renewal — which will always be newer — still
gets processed normally.

## Deploy
```
supabase functions deploy flutterwave-webhook
```
